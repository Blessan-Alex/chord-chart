import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/data/models/lyric_line.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/chord_marks.dart';

Map<String, dynamic> chordMarkToMap(ChordMark mark) {
  final normalized = serializeChordMarkForPublish(mark);
  return {
    'chord': normalized.chord,
    'start': normalized.start,
    'end': normalized.end,
  };
}

Map<String, dynamic> lyricLineToMap(LyricLine line) {
  return {
    'lyrics': line.lyrics,
    'chords': line.chords.map(chordMarkToMap).toList(),
  };
}

Map<String, dynamic> sectionToMap(Section section) {
  return {
    'label': section.label,
    'lines': section.lines.map(lyricLineToMap).toList(),
  };
}

List<Map<String, dynamic>> sectionsToFirestore(List<Section> sections) {
  return serializeSectionsForPublish(sections).map(sectionToMap).toList();
}
