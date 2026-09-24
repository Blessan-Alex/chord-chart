import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/chord_pro_parser.dart';

void main() {
  test('parseChordProLine extracts chords at lyric positions', () {
    final line = parseChordProLine('[G]Amazing [C]grace');
    expect(line.lyrics, 'Amazing grace');
    expect(line.chords.length, 2);
    expect(line.chords.first.chord, 'G');
  });

  test('parseChordProSections reads section headers', () {
    final sections = parseChordProSections('{Verse 1}\n[G]Hello world');
    expect(sections.length, 1);
    expect(sections.first.label, 'Verse 1');
    expect(sections.first.lines.single.lyrics, 'Hello world');
  });
}
