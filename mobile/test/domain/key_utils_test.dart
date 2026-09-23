import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/key_utils.dart';

void main() {
  test('transposes keys by semitones', () {
    expect(transposeKeyBy('C', 2), 'D');
    expect(transposeKeyBy('B', 1), 'C');
    expect(transposeKeyBy('C', -1), 'B');
  });

  test('validates keys', () {
    expect(isKey('G'), isTrue);
    expect(isKey('H'), isFalse);
  });
}
