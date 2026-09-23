import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:lf_chords/domain/constants.dart';
import 'package:lf_chords/domain/playlist_invite_token.dart';
import 'package:lf_chords/domain/session_navigation.dart';

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
    return _mergeSessionQueries([
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
  }

  Future<List<PlaylistSession>> listOwnedPlaylists(String uid) {
    return _mergeSessionQueries([
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
  }

  Future<PlaylistSession?> getSession(String sessionId) async {
    final snap = await _sessions.doc(sessionId).get();
    if (!snap.exists) {
      return null;
    }
    return PlaylistSession.fromMap(snap.id, snap.data()!);
  }

  Future<PlaylistSession> createSession({
    required String title,
    required DateTime date,
    required String createdBy,
    String? ownerUsername,
    String serviceType = 'sunday_morning',
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

  Future<void> deleteSession(PlaylistSession session) async {
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
