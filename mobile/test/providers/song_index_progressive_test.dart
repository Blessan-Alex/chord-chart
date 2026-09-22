import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/providers/song_index_providers.dart';

void main() {
  group('shouldApplySongIndexPartial', () {
    test('accepts partial when length equals bestCount', () {
      expect(shouldApplySongIndexPartial(10, 10), isTrue);
    });

    test('accepts partial when length exceeds bestCount', () {
      expect(shouldApplySongIndexPartial(2000, 10), isTrue);
    });

    test('rejects partial when length is below bestCount', () {
      expect(shouldApplySongIndexPartial(5, 10), isFalse);
    });
  });
}
