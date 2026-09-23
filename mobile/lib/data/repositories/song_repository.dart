import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lf_chords/data/mappers/firestore_song_mapper.dart';
import 'package:lf_chords/data/models/song.dart';

class SongRepository {
  SongRepository(this._firestore);

  final FirebaseFirestore _firestore;

  Stream<LiveSongPayload> watchSong(String songId) {
    if (songId.isEmpty) {
      return Stream.value(LiveSongPayload.empty);
    }

    return _firestore
        .collection('songs')
        .doc(songId)
        .snapshots()
        .map((snap) {
      if (!snap.exists) {
        return const LiveSongPayload(ready: true);
      }
      return mapLiveSongPayload(snap.id, snap.data());
    }).transform(
      StreamTransformer<LiveSongPayload, LiveSongPayload>.fromHandlers(
        handleData: (data, sink) => sink.add(data),
        handleError: (Object error, StackTrace stackTrace,
            EventSink<LiveSongPayload> sink) {
          sink.add(const LiveSongPayload(ready: true));
        },
      ),
    );
  }

  Future<Map<String, dynamic>?> getSongRaw(String songId) async {
    final ref = _firestore.collection('songs').doc(songId);
    try {
      final snap = await ref.get(const GetOptions(source: Source.cache));
      if (snap.exists) {
        return snap.data();
      }
    } catch (_) {}
    try {
      final snap = await ref.get(const GetOptions(source: Source.server));
      if (snap.exists) {
        return snap.data();
      }
    } catch (_) {}
    return null;
  }
}
