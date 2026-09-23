import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lf_chords/domain/playlist_access.dart';
import 'package:lf_chords/domain/playlist_invite_token.dart';
import 'package:lf_chords/domain/session_navigation.dart';

const _inviteTokensCollection = 'playlistInviteTokens';
const _sessionsCollection = 'sessions';

class PlaylistInvitesRepository {
  PlaylistInvitesRepository(this._firestore);

  final FirebaseFirestore _firestore;

  Future<String> ensurePlaylistInviteToken(
    PlaylistSession session,
    String ownerId,
  ) async {
    if (!isPlaylistOwner(session, ownerId)) {
      throw StateError('Only the playlist owner can share this playlist');
    }

    if (session.shareToken != null && session.shareToken!.isNotEmpty) {
      final existing = await _firestore
          .collection(_inviteTokensCollection)
          .doc(session.shareToken)
          .get();
      if (existing.exists) {
        return session.shareToken!;
      }
    }

    return createPlaylistInviteToken(session, ownerId);
  }

  Future<String> createPlaylistInviteToken(
    PlaylistSession session,
    String ownerId,
  ) async {
    if (!isPlaylistOwner(session, ownerId)) {
      throw StateError('Only the playlist owner can create an invite link');
    }

    final token = generatePlaylistInviteToken();
    final batch = _firestore.batch();
    batch.set(_firestore.collection(_inviteTokensCollection).doc(token), {
      'sessionId': session.id,
      'ownerId': ownerId,
      'title': session.title,
      'createdAt': FieldValue.serverTimestamp(),
    });
    batch.update(_firestore.collection(_sessionsCollection).doc(session.id), {
      'shareToken': token,
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return token;
  }

  Future<String> regeneratePlaylistInviteToken(
    PlaylistSession session,
    String ownerId,
  ) async {
    if (!isPlaylistOwner(session, ownerId)) {
      throw StateError('Only the playlist owner can reset the invite link');
    }

    final batch = _firestore.batch();
    if (session.shareToken != null && session.shareToken!.isNotEmpty) {
      batch.delete(
        _firestore.collection(_inviteTokensCollection).doc(session.shareToken),
      );
    }

    final token = generatePlaylistInviteToken();
    batch.set(_firestore.collection(_inviteTokensCollection).doc(token), {
      'sessionId': session.id,
      'ownerId': ownerId,
      'title': session.title,
      'createdAt': FieldValue.serverTimestamp(),
    });
    batch.update(_firestore.collection(_sessionsCollection).doc(session.id), {
      'shareToken': token,
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return token;
  }
}
