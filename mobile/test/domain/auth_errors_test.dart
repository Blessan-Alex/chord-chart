import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/auth_errors.dart';

void main() {
  group('formatAuthError', () {
    test('maps common Firebase auth codes to friendly messages', () {
      expect(
        formatAuthError(
          FirebaseAuthException(code: 'popup-closed-by-user'),
        ),
        'Sign-in was cancelled.',
      );
      expect(
        formatAuthError(
          FirebaseAuthException(code: 'account-exists-with-different-credential'),
        ),
        'This email already has an account. Sign in with email and password instead.',
      );
      expect(
        formatAuthError(
          FirebaseAuthException(code: 'invalid-login-credentials'),
        ),
        'Incorrect email or password.',
      );
    });
  });
}
