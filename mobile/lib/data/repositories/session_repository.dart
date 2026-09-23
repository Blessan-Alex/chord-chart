import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:lf_chords/data/repositories/session_songs_repository.dart';
import 'package:lf_chords/domain/constants.dart';
import 'package:lf_chords/domain/playlist_invite_token.dart';
import 'package:lf_chords/domain/playlist_access.dart';
import 'package:lf_chords/domain/session_navigation.dart';
import 'package:lf_chords/domain/validation.dart';

const _sessionsCollection = 'sessions';
const _inviteTokensCollection = 'playlistInviteTokens';

class SessionRepository {
  SessionRepository(this._firestore);

  final FirebaseFirestore _firestore;

  CollectionReference<Map<String, dynamic>> get _sessions =>
      _firestore.collection(_sessionsCollection);

  Future<List<PlaylistSession>> listPlaylistsForUser(
    String uid, {
    int publishedLimit = publishedPlaylistCap,
  }) async {
    final merged = await _mergeSessionQueries([
      _QuerySpec(
        label: 'owned-by-ownerId',
        query: _sessions
            .where('ownerId', isEqualTo: uid)
            .orderBy('date', descending: true),
      ),
      _QuerySpec(
        label: 'owned-by-createdBy',
        query: _sessions
            .where('createdBy', isEqualTo: uid)
            .orderBy('date', descending: true),
      ),
      _QuerySpec(
        label: 'shared-with',
        query: _sessions
            .where('sharedWith', arrayContains: uid)
            .orderBy('date', descending: true),
      ),
      _QuerySpec(
        label: 'published',
        query: _sessions
            .where('status', isEqualTo: 'published')
            .orderBy('date', descending: true)
            .limit(publishedLimit),
      ),
    ]);
    return merged
        .where((s) => s.groupId == null || s.groupId!.isEmpty)
        .toList();
  }

  Future<List<PlaylistSession>> listPlaylistsForGroup(
    String groupId, {
    int? limit,
    bool strict = false,
  }) async {
    var q = _sessions
        .where('groupId', isEqualTo: groupId)
        .orderBy('date', descending: true);
    if (limit != null) {
      q = q.limit(limit);
    }
    try {
      final snap = await q.get();
      return snap.docs
          .map((d) => PlaylistSession.fromMap(d.id, d.data()))
          .toList();
    } catch (error, stack) {
      if (strict) {
        debugPrint('[sessions] group $groupId query failed: $error\n$stack');
        rethrow;
      }
      debugPrint('[sessions] group $groupId query failed: $error\n$stack');
      return [];
    }
  }

  Future<List<PlaylistSession>> listOwnedPlaylists(String uid) async {
    final merged = await _mergeSessionQueries([
      _QuerySpec(
        label: 'owned-by-ownerId',
        query: _sessions
            .where('ownerId', isEqualTo: uid)
            .orderBy('date', descending: true),
      ),
      _QuerySpec(
        label: 'owned-by-createdBy',
        query: _sessions
            .where('createdBy', isEqualTo: uid)
            .orderBy('date', descending: true),
      ),
    ]);
    return merged
        .where((s) => s.groupId == null || s.groupId!.isEmpty)
        .toList();
  }

  Future<PlaylistSession?> getSession(String sessionId) async {
    final snap = await _sessions.doc(sessionId).get();
    if (!snap.exists) {
      return null;
    }
    return PlaylistSession.fromMap(snap.id, snap.data()!);
  }

  /// Prefetch session + ordered sessionSongs query + song bodies for offline use.
  /// All-or-nothing — any server read failure throws (web `Promise.all`).
  Future<void> cacheSessionOffline(
    String sessionId,
    SessionSongsRepository sessionSongs,
  ) async {
    await _sessions
        .doc(sessionId)
        .get(const GetOptions(source: Source.server));
    final entries = await sessionSongs.listSessionSongsFromServer(sessionId);
    await Future.wait(
      entries.map(
        (entry) => _firestore.collection('songs').doc(entry.songId).get(
              const GetOptions(source: Source.server),
            ),
      ),
    );
  }

  Future<PlaylistSession> createSession({
    required String title,
    required DateTime date,
    required String createdBy,
    String? ownerUsername,
    String serviceType = 'sunday_morning',
    String? groupId,
  }) async {
    final ref = _sessions.doc();
    final data = <String, dynamic>{
      'title': title.trim(),
      'serviceType': serviceType,
      'date': Timestamp.fromDate(date),
      'songCount': 0,
      'status': 'draft',
      'createdBy': createdBy,
      'ownerId': createdBy,
      'sharedWith': <String>[],
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    };
    if (groupId != null && groupId.isNotEmpty) {
      data['groupId'] = groupId;
    }
    final owner = ownerUsername?.trim();
    if (owner != null && owner.isNotEmpty) {
      data['ownerUsername'] = owner;
    }

    await ref.set(data);

    final createdSession = await getSession(ref.id);
    if (createdSession == null) {
      throw StateError('Failed to read created playlist');
    }
    var created = createdSession;

    try {
      final token = await _attachPlaylistInviteToken(
        ref.id,
        title,
        createdBy,
      );
      created = created.withShareToken(token);
    } catch (error, stack) {
      debugPrint('[sessions] invite token create failed: $error\n$stack');
    }

    return created;
  }

  Future<void> updateSessionStatus(String sessionId, String status) async {
    await _sessions.doc(sessionId).update({
      'status': status,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> deleteSession(
    PlaylistSession session,
    String actorUid, {
    bool asGroupOwner = false,
    bool skipGroupCountUpdate = false,
  }) async {
    if (!isPlaylistOwner(session, actorUid) &&
        !(asGroupOwner && session.groupId != null && session.groupId!.isNotEmpty)) {
      throw StateError('Only the playlist owner can delete this playlist');
    }

    final batch = _firestore.batch();
    final songsSnap = await _sessions
        .doc(session.id)
        .collection('sessionSongs')
        .get();
    for (final doc in songsSnap.docs) {
      batch.delete(doc.reference);
    }
    if (session.shareToken != null && session.shareToken!.isNotEmpty) {
      batch.delete(
        _firestore.collection(_inviteTokensCollection).doc(session.shareToken),
      );
    }
    batch.delete(_sessions.doc(session.id));
    await batch.commit();

    if (session.groupId != null &&
        session.groupId!.isNotEmpty &&
        !skipGroupCountUpdate) {
      try {
        await _decrementGroupPlaylistCount(session.groupId!);
      } on FirebaseException catch (error) {
        if (error.code != 'permission-denied') {
          rethrow;
        }
        debugPrint(
          '[sessions] group playlistCount decrement skipped (non-owner): '
          '${error.message}',
        );
      }
    }
  }

  Future<void> sharePlaylistByUsername({
    required PlaylistSession session,
    required String usernameRaw,
    required String inviterUid,
  }) async {
    if (!isPlaylistOwner(session, inviterUid)) {
      throw StateError('Only the playlist owner can share');
    }

    final validated = validateUsername(usernameRaw);
    if (validated is! UsernameValid) {
      throw StateError((validated as UsernameInvalid).error);
    }

    final inviteeUid = await _resolveUsernameToUid(validated.normalized);
    if (inviteeUid == null) {
      throw StateError(
        'No user @${validated.normalized}. They need an account with that username in Profile.',
      );
    }

    if (inviteeUid == inviterUid) {
      throw StateError('You cannot share with yourself');
    }

    if (session.sharedWith.contains(inviteeUid)) {
      throw StateError('That user already has access');
    }

    final member = PlaylistMemberRecord(
      uid: inviteeUid,
      username: validated.normalized,
      displayName: validated.normalized,
    );

    await _sessions.doc(session.id).update({
      'sharedWith': FieldValue.arrayUnion([inviteeUid]),
      'sharedMembers': FieldValue.arrayUnion([
        {
          'uid': member.uid,
          'username': member.username,
          'displayName': member.displayName,
        },
      ]),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<String?> _resolveUsernameToUid(String usernameLower) async {
    final snap = await _firestore
        .collection('usernames')
        .doc(usernameLower)
        .get();
    if (!snap.exists) {
      return null;
    }
    return snap.data()?['uid'] as String?;
  }

  Future<void> _decrementGroupPlaylistCount(String groupId) async {
    final ref = _firestore.collection('groups').doc(groupId);
    final snap = await ref.get();
    if (!snap.exists) {
      return;
    }
    final current = (snap.data()?['playlistCount'] as num?)?.toInt() ?? 0;
    await ref.update({
      'playlistCount': current > 0 ? current - 1 : 0,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<String> _attachPlaylistInviteToken(
    String sessionId,
    String title,
    String ownerId,
  ) async {
    final token = generatePlaylistInviteToken();
    final batch = _firestore.batch();
    batch.set(_firestore.collection(_inviteTokensCollection).doc(token), {
      'sessionId': sessionId,
      'ownerId': ownerId,
      'title': title.trim(),
      'createdAt': FieldValue.serverTimestamp(),
    });
    batch.update(_sessions.doc(sessionId), {
      'shareToken': token,
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return token;
  }

  Future<List<PlaylistSession>> _mergeSessionQueries(
    List<_QuerySpec> queries,
  ) async {
    final batches = await Future.wait(
      queries.map((spec) async {
        try {
          final snap = await spec.query.get();
          return snap.docs
              .map((d) => PlaylistSession.fromMap(d.id, d.data()))
              .toList();
        } catch (error, stack) {
          debugPrint('[sessions] ${spec.label} query failed: $error\n$stack');
          return <PlaylistSession>[];
        }
      }),
    );

    final byId = <String, PlaylistSession>{};
    for (final sessions in batches) {
      for (final session in sessions) {
        byId[session.id] = session;
      }
    }

    final merged = byId.values.toList()
      ..sort((a, b) => b.date.compareTo(a.date));
    return merged;
  }
}

class _QuerySpec {
  _QuerySpec({required this.label, required this.query});

  final String label;
  final Query<Map<String, dynamic>> query;
}
