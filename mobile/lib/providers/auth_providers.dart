import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:lf_chords/data/models/user_profile.dart';
import 'package:lf_chords/data/repositories/auth_repository.dart';
import 'package:lf_chords/data/repositories/user_repository.dart';

final firebaseAuthProvider = Provider<FirebaseAuth>(
  (ref) => FirebaseAuth.instance,
);

final firestoreProvider = Provider<FirebaseFirestore>(
  (ref) => FirebaseFirestore.instance,
);

final userRepositoryProvider = Provider<UserRepository>(
  (ref) => UserRepository(ref.watch(firestoreProvider)),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    auth: ref.watch(firebaseAuthProvider),
    users: ref.watch(userRepositoryProvider),
  ),
);

class AuthSession {
  const AuthSession({
    this.user,
    this.profile,
    this.loading = true,
    this.profileResolved = false,
    this.needsUsernameOnboarding = false,
    this.isAdmin = false,
    this.authError,
    this.isGoogleSigningIn = false,
    this.signUpInProgress = false,
  });

  final User? user;
  final UserProfile? profile;
  final bool loading;
  final bool profileResolved;
  final bool needsUsernameOnboarding;
  final bool isAdmin;
  final String? authError;
  final bool isGoogleSigningIn;
  final bool signUpInProgress;

  static const _unset = Object();

  AuthSession copyWith({
    Object? user = _unset,
    Object? profile = _unset,
    bool? loading,
    bool? profileResolved,
    bool? needsUsernameOnboarding,
    bool? isAdmin,
    String? authError,
    bool clearAuthError = false,
    bool? isGoogleSigningIn,
    bool? signUpInProgress,
  }) {
    return AuthSession(
      user: identical(user, _unset) ? this.user : user as User?,
      profile: identical(profile, _unset) ? this.profile : profile as UserProfile?,
      loading: loading ?? this.loading,
      profileResolved: profileResolved ?? this.profileResolved,
      needsUsernameOnboarding:
          needsUsernameOnboarding ?? this.needsUsernameOnboarding,
      isAdmin: isAdmin ?? this.isAdmin,
      authError: clearAuthError ? null : authError ?? this.authError,
      isGoogleSigningIn: isGoogleSigningIn ?? this.isGoogleSigningIn,
      signUpInProgress: signUpInProgress ?? this.signUpInProgress,
    );
  }

  static AuthSession initial() => const AuthSession(
        loading: true,
        profileResolved: false,
        signUpInProgress: false,
      );
}

class AuthController extends ChangeNotifier {
  AuthController(this._authRepository) {
    _subscription = _authRepository.authStateChanges().listen(_onAuthUser);
  }

  final AuthRepository _authRepository;
  StreamSubscription<User?>? _subscription;
  bool _signUpInProgress = false;

  AuthSession _session = AuthSession.initial();
  AuthSession get session => _session;

  bool get signUpInProgress => _signUpInProgress;

  Future<void> _onAuthUser(User? nextUser) async {
    _session = _session.copyWith(
      user: nextUser,
      profile: null,
      profileResolved: false,
    );
    notifyListeners();

    if (nextUser != null) {
      try {
        final isAdmin = await _authRepository.readIsAdmin(nextUser);
        await _authRepository.runSignedInLifecycle(
          nextUser,
          skipLegacyEnsure: _signUpInProgress,
        );
        final loadedProfile = await _authRepository.loadProfile(nextUser.uid);
        _session = _session.copyWith(
          profile: loadedProfile,
          isAdmin: isAdmin,
          needsUsernameOnboarding: loadedProfile != null &&
              (loadedProfile.username == null ||
                  loadedProfile.username!.isEmpty),
        );
      } catch (_) {
        _session = _session.copyWith(
          profile: null,
          isAdmin: false,
          needsUsernameOnboarding: false,
        );
      }
    } else {
      _session = _session.copyWith(
        user: null,
        profile: null,
        isAdmin: false,
        needsUsernameOnboarding: false,
      );
    }

    _session = _session.copyWith(
      profileResolved: true,
      loading: false,
    );
    notifyListeners();
  }

  void clearAuthError() {
    _session = _session.copyWith(clearAuthError: true);
    notifyListeners();
  }

  Future<void> signIn(String email, String password) {
    return _authRepository.signInWithEmail(email, password);
  }

  Future<void> signInWithGoogle() async {
    _session = _session.copyWith(isGoogleSigningIn: true);
    notifyListeners();
    try {
      await _authRepository.signInWithGoogle();
    } finally {
      _session = _session.copyWith(isGoogleSigningIn: false);
      notifyListeners();
    }
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String displayName,
    required String username,
  }) async {
    _signUpInProgress = true;
    _session = _session.copyWith(signUpInProgress: true, profileResolved: false);
    notifyListeners();
    try {
      await _authRepository.signUp(
        email: email,
        password: password,
        displayName: displayName,
        username: username,
      );
      final user = _authRepository.currentUser;
      if (user != null) {
        final loadedProfile = await _authRepository.loadProfile(user.uid);
        _session = _session.copyWith(
          user: user,
          profile: loadedProfile,
          profileResolved: true,
          loading: false,
          needsUsernameOnboarding: loadedProfile != null &&
              (loadedProfile.username == null ||
                  loadedProfile.username!.isEmpty),
        );
        notifyListeners();
      }
    } finally {
      _signUpInProgress = false;
      _session = _session.copyWith(signUpInProgress: false);
      notifyListeners();
    }
  }

  Future<void> signOut() => _authRepository.signOut();

  Future<void> updateDisplayName(String displayName) async {
    final user = _session.user;
    if (user == null) {
      throw Exception('Not signed in');
    }
    await _authRepository.updateDisplayName(user, displayName);
    final profile = await _authRepository.loadProfile(user.uid);
    _session = _session.copyWith(profile: profile);
    notifyListeners();
  }

  Future<void> claimUsername(String username) async {
    final user = _session.user;
    if (user == null) {
      throw Exception('Not signed in');
    }
    await _authRepository.claimUsername(user.uid, username);
    final loadedProfile = await _authRepository.loadProfile(user.uid);
    _session = _session.copyWith(
      profile: loadedProfile,
      needsUsernameOnboarding: loadedProfile != null &&
          (loadedProfile.username == null || loadedProfile.username!.isEmpty),
    );
    notifyListeners();
  }

  Future<bool> checkUsernameAvailable(String username) {
    return _authRepository.checkUsernameAvailable(username);
  }

  Future<UserProfile?> reloadProfile() async {
    final uid = _session.user?.uid;
    if (uid == null) {
      return null;
    }
    final profile = await _authRepository.loadProfile(uid);
    _session = _session.copyWith(
      profile: profile,
      needsUsernameOnboarding: profile != null &&
          (profile.username == null || profile.username!.isEmpty),
    );
    notifyListeners();
    return profile;
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

final authControllerProvider = ChangeNotifierProvider<AuthController>((ref) {
  final controller = AuthController(ref.watch(authRepositoryProvider));
  ref.onDispose(controller.dispose);
  return controller;
});

final authSessionProvider = Provider<AuthSession>((ref) {
  return ref.watch(authControllerProvider).session;
});
