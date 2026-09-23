import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/wrap_lyric_line.dart';

void main() {
  test('charsPerLine uses container width and font size', () {
    expect(charsPerLine(390, 18), greaterThan(30));
    expect(charsPerLine(0, 18), 32);
  });
}
