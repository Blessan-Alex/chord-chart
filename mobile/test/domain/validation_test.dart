import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/validation.dart';

void main() {
  group('validateUsername', () {
    test('accepts valid usernames', () {
      expect(
        validateUsername('alex_rivera'),
        isA<UsernameValid>().having((r) => r.normalized, 'normalized', 'alex_rivera'),
      );
    });

    test('normalizes uppercase input', () {
      final result = validateUsername('AlexRivera');
      expect(result, isA<UsernameValid>());
      expect((result as UsernameValid).normalized, 'alexrivera');
    });

    test('rejects empty usernames', () {
      expect(validateUsername('   '), isA<UsernameInvalid>());
    });

    test('rejects too long usernames', () {
      final result = validateUsername('a' * 21);
      expect(result, isA<UsernameInvalid>());
      expect((result as UsernameInvalid).error, contains('3–20'));
    });

    test('rejects invalid characters', () {
      expect(validateUsername('bad-name'), isA<UsernameInvalid>());
    });
  });
}
