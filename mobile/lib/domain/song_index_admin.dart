import 'package:lf_chords/data/models/song_index_entry.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/constants.dart';
import 'package:lf_chords/domain/keys.dart';
import 'package:lf_chords/domain/song_search_text.dart';

SongIndexEntry songToIndexEntry({
  required String id,
  required String title,
  String artist = '',
  required String originalKey,
  List<String> tags = const [],
  List<Section>? sections,
  int updatedAtMs = 0,
}) {
  final key = isValidKey(originalKey) ? originalKey : 'C';
  final sectionMaps = sections
          ?.map(
            (s) => {
              'lines': s.lines
                  .map((l) => {'lyrics': l.lyrics})
                  .toList(),
            },
          )
          .toList() ??
      const [];

  return SongIndexEntry(
    id: id,
    title: title,
    artist: artist,
    key: key,
    tags: tags,
    updatedAtMs: updatedAtMs,
    searchText: buildSongSearchText(
      title: title,
      artist: artist,
      tags: tags,
      sections: sectionMaps,
    ),
  );
}

List<SongIndexEntry> mergeIndexEntry(
  List<SongIndexEntry> entries,
  SongIndexEntry entry,
) {
  final next = entries.where((e) => e.id != entry.id).toList()..add(entry);
  next.sort((a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()));
  return next;
}

Map<String, List<SongIndexEntry>> buildIndexChunks(
  List<SongIndexEntry> entries,
) {
  final sorted = [...entries]
    ..sort((a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()));
  final chunks = <String, List<SongIndexEntry>>{};

  for (var i = 0; i < songIndexChunkIds.length; i++) {
    final start = i * songIndexChunkSize;
    final sliceEnd = (start + songIndexChunkSize).clamp(0, sorted.length);
    if (start >= sliceEnd) {
      break;
    }
    final slice = sorted.sublist(start, sliceEnd);
    if (slice.isNotEmpty) {
      chunks[songIndexChunkIds[i]] = slice;
    }
  }
  return chunks;
}
