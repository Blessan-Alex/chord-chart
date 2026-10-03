import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/data/models/lyric_line.dart';
import 'package:lf_chords/domain/chord_placement.dart';
import 'package:lf_chords/domain/chord_pro_parser.dart';

void main() {
  test('placed sections round-trip through ChordPro serialize and parse', () {
    var line = const LyricLine(lyrics: 'little star', chords: []);
    line = applyPlacement(line, const PlacementSlot.gap(index: 6), 'C').line;
    line = applyPlacement(line, const PlacementSlot.gap(index: 6), 'G').line;

    final text = serializeChordProLine(line);
    final reparsed = parseChordProLine(text);

    expect(reparsed.lyrics, line.lyrics);
    expect(reparsed.chords.length, line.chords.length);
    expect(reparsed.chords.first.chord, 'C');
    expect(reparsed.chords.last.chord, 'G');
  });
}
