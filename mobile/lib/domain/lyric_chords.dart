import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/domain/chord_marks.dart';

String lyricChordsSignature(List<ChordMark> chords) {
  return chords
      .map((mark) {
        final normalized = normalizeChordMark(mark);
        return '${normalized.chord}@${normalized.start}-${normalized.end}';
      })
      .join('|');
}

List<int> lyricChordStarts(List<ChordMark> chords) {
  return chords.map((mark) => getMarkStart(normalizeChordMark(mark))).toList();
}
