import 'dart:math';

import 'package:lf_chords/data/models/user_profile.dart';

const groupInviteCodeLength = 8;
const _inviteAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

class GroupMemberInfo {
  const GroupMemberInfo({
    required this.uid,
    this.username,
    required this.displayName,
  });

  final String uid;
  final String? username;
  final String displayName;

  Map<String, dynamic> toMap() => {
        'uid': uid,
        if (username != null && username!.isNotEmpty) 'username': username,
        'displayName': displayName,
      };

  factory GroupMemberInfo.fromMap(Map<String, dynamic> data) {
    return GroupMemberInfo(
      uid: data['uid'] as String? ?? '',
      username: data['username'] as String?,
      displayName: data['displayName'] as String? ?? 'Musician',
    );
  }
}

class Group {
  const Group({
    required this.id,
    required this.name,
    required this.ownerId,
    this.ownerUsername,
    required this.memberIds,
    required this.members,
    required this.inviteCode,
    required this.playlistCount,
  });

  final String id;
  final String name;
  final String ownerId;
  final String? ownerUsername;
  final List<String> memberIds;
  final List<GroupMemberInfo> members;
  final String inviteCode;
  final int playlistCount;

  factory Group.fromMap(String id, Map<String, dynamic> data) {
    final memberIdsRaw = data['memberIds'];
    final membersRaw = data['members'];
    return Group(
      id: id,
      name: data['name'] as String? ?? '',
      ownerId: data['ownerId'] as String? ?? '',
      ownerUsername: data['ownerUsername'] as String?,
      memberIds: memberIdsRaw is List
          ? memberIdsRaw.map((e) => e.toString()).toList()
          : const [],
      members: membersRaw is List
          ? membersRaw
              .whereType<Map>()
              .map(
                (m) => GroupMemberInfo.fromMap(Map<String, dynamic>.from(m)),
              )
              .toList()
          : const [],
      inviteCode: data['inviteCode'] as String? ?? '',
      playlistCount: (data['playlistCount'] as num?)?.toInt() ?? 0,
    );
  }
}

String generateGroupInviteCode() {
  final random = Random();
  final buffer = StringBuffer();
  for (var i = 0; i < groupInviteCodeLength; i++) {
    buffer.write(_inviteAlphabet[random.nextInt(_inviteAlphabet.length)]);
  }
  return buffer.toString();
}

String normalizeGroupInviteCode(String raw) => raw.trim().toUpperCase();

bool isGroupOwner(Group group, String uid) => group.ownerId == uid;

bool isGroupMember(Group group, String uid) => group.memberIds.contains(uid);

GroupMemberInfo memberFromProfile(String uid, UserProfile? profile) {
  final displayName = profile?.displayName.trim().isNotEmpty == true
      ? profile!.displayName.trim()
      : profile?.email.split('@').first ?? 'Musician';
  return GroupMemberInfo(
    uid: uid,
    username: profile?.username,
    displayName: displayName,
  );
}
