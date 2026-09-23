import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lf_chords/domain/session_navigation.dart';

const sessionSongOrderStep = 1000;

double computeMidOrder(double prevOrder, double nextOrder) =>
    (prevOrder + nextOrder) / 2;

class SessionSongsRepository {
  SessionSongsRepository(this._firestore);

  final FirebaseFirestore _firestore;

  CollectionReference<Map<String, dynamic>> _songsRef(String sessionId) =>
      _firestore.collection('sessions').doc(sessionId).collection('sessionSongs');

  Stream<List<SessionSongEntry>> watchSessionSongs(String sessionId) {
    return _songsRef(sessionId)
        .orderBy('order')
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => SessionSongEntry.fromMap(d.id, d.data()))
              .toList(),
        );
  }

  Future<List<SessionSongEntry>> listSessionSongs(String sessionId) async {
    final snap = await _songsRef(sessionId).orderBy('order').get();
    return snap.docs
        .map((d) => SessionSongEntry.fromMap(d.id, d.data()))
        .toList();
  }

  Future<void> addSongToSession({
    required String sessionId,
    required String songId,
    required String songTitle,
    required String addedBy,
  }) async {
    final existing = await listSessionSongs(sessionId);
    if (existing.any((e) => e.songId == songId)) {
      throw StateError('Song is already in this playlist');
    }

    await _firestore.runTransaction((tx) async {
      final sessionRef = _firestore.collection('sessions').doc(sessionId);
      final sessionSnap = await tx.get(sessionRef);
      if (!sessionSnap.exists) {
        throw StateError('Session not found');
      }
      final songCount = (sessionSnap.data()?['songCount'] as num?)?.toInt() ?? 0;
      final newOrder = (songCount + 1) * sessionSongOrderStep;
      final entryRef = _songsRef(sessionId).doc();

      tx.set(entryRef, {
        'songId': songId,
        'songTitle': songTitle,
        'order': newOrder,
        'keyOverride': null,
        'notes': null,
        'addedBy': addedBy,
        'addedAt': FieldValue.serverTimestamp(),
      });

      tx.update(sessionRef, {
        'songCount': songCount + 1,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    });
  }

  Future<void> removeSongFromSession(String sessionId, String entryId) async {
    await _firestore.runTransaction((tx) async {
      final sessionRef = _firestore.collection('sessions').doc(sessionId);
      final sessionSnap = await tx.get(sessionRef);
      if (!sessionSnap.exists) {
        throw StateError('Session not found');
      }
      final songCount = (sessionSnap.data()?['songCount'] as num?)?.toInt() ?? 0;
      tx.delete(_songsRef(sessionId).doc(entryId));
      tx.update(sessionRef, {
        'songCount': songCount > 0 ? songCount - 1 : 0,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    });
  }

  Future<void> reorderSessionSong(
    String sessionId,
    String entryId,
    double prevOrder,
    double nextOrder,
  ) async {
    final mid = computeMidOrder(prevOrder, nextOrder);
    await _songsRef(sessionId).doc(entryId).update({'order': mid});
  }

  Future<void> updateSessionSongKeyOverride(
    String sessionId,
    String entryId,
    String? keyOverride,
  ) async {
    await _songsRef(sessionId).doc(entryId).update({
      'keyOverride': keyOverride,
    });
  }

  Future<void> moveSessionSongUp(
    String sessionId,
    List<SessionSongEntry> songs,
    int index,
  ) async {
    if (index <= 0) {
      return;
    }
    final current = songs[index];
    final prev = songs[index - 1];
    final beforePrev = index >= 2 ? songs[index - 2].order : 0.0;
    await reorderSessionSong(sessionId, current.id, beforePrev, prev.order);
  }

  Future<void> moveSessionSongDown(
    String sessionId,
    List<SessionSongEntry> songs,
    int index,
  ) async {
    if (index >= songs.length - 1) {
      return;
    }
    final current = songs[index];
    final next = songs[index + 1];
    final afterNext = index < songs.length - 2
        ? songs[index + 2].order
        : next.order + sessionSongOrderStep;
    await reorderSessionSong(sessionId, current.id, next.order, afterNext);
  }
}
