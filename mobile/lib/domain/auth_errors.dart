import 'package:firebase_auth/firebase_auth.dart';

String formatError(Object? value) {
  if (value is Exception) {
    return value.toString().replaceFirst('Exception: ', '');
  }
  if (value is String) {
    return value;
  }
  return 'Something went wrong';
}

String? _authErrorCode(Object? error) {
  if (error is FirebaseAuthException) {
    return error.code;
  }
  return null;
}

/// Friendly messages for Firebase Auth errors shown in login/signup UI.
String formatAuthError(Object? error) {
  final code = _authErrorCode(error);
  switch (code) {
    case 'popup-closed-by-user':
    case 'redirect-cancelled-by-user':
      return 'Sign-in was cancelled.';
    case 'popup-blocked':
      return 'Pop-up was blocked. Allow pop-ups for this site or try again.';
    case 'cancelled-popup-request':
      return 'Sign-in was interrupted. Please try again.';
    case 'account-exists-with-different-credential':
      return 'This email already has an account. Sign in with email and password instead.';
    case 'email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'invalid-credential':
    case 'wrong-password':
    case 'user-not-found':
    case 'invalid-login-credentials':
      return 'Incorrect email or password.';
    case 'too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'unauthorized-domain':
      return 'This site is not authorized for sign-in. Contact support if this persists.';
    case 'operation-not-allowed':
      return 'Google sign-in is not enabled for this app.';
    case 'weak-password':
      return 'Password must be at least 6 characters.';
    default:
      if (error is FirebaseAuthException && error.message != null) {
        return error.message!;
      }
      return formatError(error);
  }
}
