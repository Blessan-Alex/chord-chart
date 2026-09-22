import 'package:lf_chords/domain/constants.dart';

List<String> flattenSectionsLyrics(List<Map<String, dynamic>> sections) {
  final lines = <String>[];
  for (final section in sections) {
    final sectionLines = section['lines'];
    if (sectionLines is! List) {
      continue;
    }
    for (final line in sectionLines) {
      if (line is Map && line['lyrics'] is String) {
        lines.add(line['lyrics'] as String);
      }
    }
  }
  return lines;
}

String buildSongSearchText({
  required String title,
  String? artist,
  List<String>? tags,
  List<Map<String, dynamic>>? sections,
}) {
  final lyricLines = flattenSectionsLyrics(sections ?? []);
  final raw = [
    title,
    artist ?? '',
    ...(tags ?? []),
    ...lyricLines,
  ].join(' ').toLowerCase().replaceAll(RegExp(r'\s+'), ' ').trim();

  if (raw.length <= songIndexSearchTextMax) {
    return raw;
  }
  return raw.substring(0, songIndexSearchTextMax);
}
