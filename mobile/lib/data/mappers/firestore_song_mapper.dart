import 'package:lf_chords/data/models/song.dart';
import 'package:lf_chords/domain/chord_marks.dart';

Song firestoreSongToSong(String id, Map<String, dynamic> data) {
  final song = Song.fromMap(id, data);
  return Song(
    id: song.id,
    title: song.title,
    originalKey: song.originalKey,
    sections: normalizeSections(song.sections),
  );
}

LiveSongPayload mapLiveSongPayload(String id, Map<String, dynamic>? data) {
  if (data == null || data['status'] != 'active') {
    return const LiveSongPayload(ready: true);
  }
  final tagsRaw = data['tags'];
  final tags = tagsRaw is List
      ? tagsRaw.whereType<String>().toList()
      : const <String>[];
  return LiveSongPayload(
    song: firestoreSongToSong(id, data),
    artist: data['artist'] as String? ?? '',
    version: (data['version'] as num?)?.toInt(),
    tags: tags,
    ready: true,
  );
}
