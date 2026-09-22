import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:lf_chords/data/models/user_profile.dart';
import 'package:lf_chords/data/repositories/user_repository.dart';
import 'package:lf_chords/domain/validation.dart';

class AuthRepository {
  AuthRepository({
    required FirebaseAuth auth,
    required UserRepository users,
  })  : _auth = auth,
        _users = users;

  final FirebaseAuth _auth;
  final UserRepository _users;

  Stream<User?> authStateChanges() => _auth.authStateChanges();

  User? get currentUser => _auth.currentUser;

  Future<void> signInWithEmail(String email, String password) {
    return _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  Future<void> signInWithGoogle() async {
    try {
      final account = await GoogleSignIn.instance.authenticate();
      final idToken = account.authentication.idToken;
      final credential = GoogleAuthProvider.credential(idToken: idToken);
      await _auth.signInWithCredential(credential);
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) {
        throw FirebaseAuthException(
          code: 'redirect-cancelled-by-user',
          message: 'Sign-in was cancelled.',
        );
      }
      rethrow;
    }
  }

  Future<void> signOut() async {
    await Future.wait([
      _auth.signOut(),
      GoogleSignIn.instance.signOut(),
    ]);
  }

  Future<UserProfile?> loadProfile(String uid) async {
    try {
      return await _users.getUserProfile(uid);
    } catch (_) {
      return null;
    }
  }

  Future<void> runSignedInLifecycle(
    User user, {
    required bool skipLegacyEnsure,
  }) async {
    if (!skipLegacyEnsure) {
      await _users.ensureLegacyUserProfile(user);
    }
    await _users.touchLastLogin(user.uid);
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String displayName,
    required String username,
  }) async {
    final trimmedName = displayName.trim();
    if (trimmedName.isEmpty) {
      throw Exception('Display name is required');
    }

    final usernameResult = validateUsername(username);
    if (usernameResult is! UsernameValid) {
      throw Exception((usernameResult as UsernameInvalid).error);
    }

    if (!await _users.isUsernameAvailable(usernameResult.normalized)) {
      throw Exception('That username is already taken');
    }

    UserCredential? credential;
    try {
      credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      await credential.user!.updateDisplayName(trimmedName);

      await _users.createUserProfile(
        CreateUserProfileInput(
          uid: credential.user!.uid,
          email: credential.user!.email ?? email,
          displayName: trimmedName,
          username: usernameResult.normalized,
        ),
      );
    } catch (error) {
      final user = credential?.user;
      if (user != null) {
        try {
          await user.delete();
        } catch (_) {
          // Best-effort cleanup if profile creation fails after auth user exists.
        }
      }
      rethrow;
    }
  }

  Future<void> updateDisplayName(User user, String displayName) async {
    final trimmed = displayName.trim();
    if (trimmed.isEmpty) {
      throw Exception('Display name is required');
    }

    await _users.updateUserDisplayName(user.uid, trimmed);
    await user.updateDisplayName(trimmed);
  }

  Future<void> claimUsername(String uid, String username) {
    return _users.claimUsername(uid, username);
  }

  Future<bool> checkUsernameAvailable(String username) async {
    final result = validateUsername(username);
    if (result is! UsernameValid) {
      return false;
    }
    return _users.isUsernameAvailable(result.normalized);
  }
}
