import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/engine.dart';

void main() {
  group('transposeChord', () {
    test('transposes C to D', () {
      expect(transposeChord('C', 'C', 'D'), 'D');
    });

    test('transposes Am to Bm from C to D', () {
      expect(transposeChord('Am', 'C', 'D'), 'Bm');
    });

    test('returns unchanged when keys match', () {
      expect(transposeChord('G7', 'G', 'G'), 'G7');
    });
  });

  group('chordToDegree', () {
    test('maps diatonic chords in C', () {
      expect(chordToDegree('C', 'C'), '1');
      expect(chordToDegree('Am', 'C'), '6m');
    });
  });

  group('isValidChord', () {
    test('rejects invalid', () {
      expect(isValidChord(''), isFalse);
    });
  });
}
