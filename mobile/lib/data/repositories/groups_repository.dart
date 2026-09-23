import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lf_chords/data/models/user_profile.dart';
import 'package:lf_chords/data/repositories/session_repository.dart';
import 'package:lf_chords/domain/group.dart';
import 'package:lf_chords/domain/validation.dart';

const _groupsCollection = 'groups';
const _groupInviteCodesCollection = 'groupInviteCodes';

class GroupsRepository {
  GroupsRepository(this._firestore, this._sessions);

  final FirebaseFirestore _firestore;
  final SessionRepository _sessions;

  Future<Group?> getGroup(String groupId) async {
    final snap = await _firestore.collection(_groupsCollection).doc(groupId).get();
    if (!snap.exists) {
      return null;
    }
    return Group.fromMap(snap.id, snap.data()!);
  }

  Future<List<Group>> listGroupsForMember(String uid) async {
    final snap = await _firestore
        .collection(_groupsCollection)
        .where('memberIds', arrayContains: uid)
        .orderBy('name')
        .get();
    return snap.docs.map((d) => Group.fromMap(d.id, d.data())).toList();
  }

  Future<Group> createGroup({
    required String name,
    required String ownerId,
    UserProfile? ownerProfile,
  }) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      throw StateError('Group name is required');
    }

    final groupRef = _firestore.collection(_groupsCollection).doc();
    final inviteCode = generateGroupInviteCode();
    final owner = memberFromProfile(ownerId, ownerProfile);

    final batch = _firestore.batch();
    batch.set(groupRef, {
      'name': trimmed,
      'ownerId': ownerId,
      if (ownerProfile?.username != null) 'ownerUsername': ownerProfile!.username,
      'memberIds': [ownerId],
      'members': [owner.toMap()],
      'inviteCode': inviteCode,
      'playlistCount': 0,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    batch.set(
      _firestore.collection(_groupInviteCodesCollection).doc(inviteCode),
      {
        'groupId': groupRef.id,
        'name': trimmed,
        'ownerId': ownerId,
        'createdAt': FieldValue.serverTimestamp(),
      },
    );
    await batch.commit();

    final created = await getGroup(groupRef.id);
    if (created == null) {
      throw StateError('Failed to read created group');
    }
    return created;
  }

  Future<Group> joinGroupByInviteCode({
    required String inviteCodeRaw,
    required String uid,
    UserProfile? profile,
  }) async {
    final inviteCode = normalizeGroupInviteCode(inviteCodeRaw);
    if (inviteCode.length != groupInviteCodeLength) {
      throw StateError('Invite code must be 8 characters');
    }

    final inviteSnap = await _firestore
        .collection(_groupInviteCodesCollection)
        .doc(inviteCode)
        .get();
    if (!inviteSnap.exists) {
      throw StateError('Invalid invite code');
    }

    final groupId = inviteSnap.data()!['groupId'] as String;
    final groupRef = _firestore.collection(_groupsCollection).doc(groupId);
    final existing = await groupRef.get();

    if (existing.exists) {
      final data = existing.data()!;
      final memberIds = (data['memberIds'] as List?)?.map((e) => e.toString()).toList() ?? [];
      if (memberIds.contains(uid)) {
        return Group.fromMap(existing.id, data);
      }
    }

    final member = memberFromProfile(uid, profile);
    await groupRef.update({
      'memberIds': FieldValue.arrayUnion([uid]),
      'members': FieldValue.arrayUnion([member.toMap()]),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    final joined = await getGroup(groupId);
    if (joined == null) {
      throw StateError('Group not found after joining');
    }
    return joined;
  }

  Future<Group> inviteGroupMemberByUsername({
    required Group group,
    required String usernameRaw,
    required String inviterUid,
  }) async {
    if (!isGroupOwner(group, inviterUid)) {
      throw StateError('Only the group owner can invite members');
    }

    final validated = validateUsername(usernameRaw);
    if (validated is! UsernameValid) {
      throw StateError((validated as UsernameInvalid).error);
    }

    final inviteeUid = await resolveUsernameToUid(validated.normalized);
    if (inviteeUid == null) {
      throw StateError('Username not found');
    }

    if (group.memberIds.contains(inviteeUid)) {
      throw StateError('That user is already a member');
    }

    final profileSnap =
        await _firestore.collection('users').doc(inviteeUid).get();
    final profile = profileSnap.exists
        ? UserProfile.fromFirestore(profileSnap.data()!)
        : null;
    final member = memberFromProfile(inviteeUid, profile);

    await _firestore.collection(_groupsCollection).doc(group.id).update({
      'memberIds': FieldValue.arrayUnion([inviteeUid]),
      'members': FieldValue.arrayUnion([member.toMap()]),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    final updated = await getGroup(group.id);
    if (updated == null) {
      throw StateError('Group not found after invite');
    }
    return updated;
  }

  Future<void> incrementGroupPlaylistCount(String groupId) async {
    final ref = _firestore.collection(_groupsCollection).doc(groupId);
    final snap = await ref.get();
    if (!snap.exists) {
      return;
    }
    final current = (snap.data()?['playlistCount'] as num?)?.toInt() ?? 0;
    try {
      await ref.update({
        'playlistCount': current + 1,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } on FirebaseException catch (error) {
      if (error.code != 'permission-denied') {
        rethrow;
      }
    }
  }

  Future<void> deleteGroup({
    required Group group,
    required String actorUid,
  }) async {
    if (!isGroupOwner(group, actorUid)) {
      throw StateError('Only the group owner can delete this group');
    }

    final playlists = await _sessions.listPlaylistsForGroup(
      group.id,
      strict: true,
    );

    for (final session in playlists) {
      await _sessions.deleteSession(
        session,
        actorUid,
        asGroupOwner: true,
        skipGroupCountUpdate: true,
      );
    }

    final batch = _firestore.batch();
    batch.delete(
      _firestore.collection(_groupInviteCodesCollection).doc(group.inviteCode),
    );
    batch.delete(_firestore.collection(_groupsCollection).doc(group.id));
    await batch.commit();
  }

  Future<String?> resolveUsernameToUid(String usernameLower) async {
    final snap = await _firestore
        .collection('usernames')
        .doc(usernameLower)
        .get();
    if (!snap.exists) {
      return null;
    }
    return snap.data()?['uid'] as String?;
  }
}
