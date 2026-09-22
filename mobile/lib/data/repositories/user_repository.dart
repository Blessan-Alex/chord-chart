import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:lf_chords/data/models/user_profile.dart';
import 'package:lf_chords/domain/user_display.dart';
import 'package:lf_chords/domain/validation.dart';

const _usersCollection = 'users';
const _usernamesCollection = 'usernames';

class UserRepository {
  UserRepository(this._firestore);

  final FirebaseFirestore _firestore;

  Future<bool> isUsernameAvailable(String usernameLower) async {
    final validated = validateUsername(usernameLower);
    if (validated is! UsernameValid) {
      return false;
    }

    final snap = await _firestore
        .collection(_usernamesCollection)
        .doc(validated.normalized)
        .get();
    return !snap.exists;
  }

  Future<UserProfile?> getUserProfile(String uid) async {
    final snap = await _firestore.collection(_usersCollection).doc(uid).get();
    if (!snap.exists) {
      return null;
    }
    return UserProfile.fromFirestore(snap.data()!);
  }

  Future<void> createUserProfile(CreateUserProfileInput input) async {
    final usernameResult = validateUsername(input.username);
    if (usernameResult is! UsernameValid) {
      throw Exception((usernameResult as UsernameInvalid).error);
    }

    final usernameLower = usernameResult.normalized;
    final displayName = input.displayName.trim().isNotEmpty
        ? input.displayName.trim()
        : input.email.split('@').first;

    if (!await isUsernameAvailable(usernameLower)) {
      throw Exception('That username is already taken');
    }

    final batch = _firestore.batch();
    final userRef = _firestore.collection(_usersCollection).doc(input.uid);

    batch.set(userRef, {
      'email': input.email,
      'displayName': displayName,
      'username': usernameLower,
      'usernameLower': usernameLower,
      'role': 'musician',
      'avatarInitials': userInitials(displayName),
      'createdAt': FieldValue.serverTimestamp(),
      'lastLoginAt': FieldValue.serverTimestamp(),
    });

    batch.set(
      _firestore.collection(_usernamesCollection).doc(usernameLower),
      {
        'uid': input.uid,
        'usernameLower': usernameLower,
        'createdAt': FieldValue.serverTimestamp(),
      },
    );

    await batch.commit();
  }

  Future<void> updateUserDisplayName(String uid, String displayName) async {
    final trimmed = displayName.trim();
    if (trimmed.isEmpty) {
      throw Exception('Display name is required');
    }

    await _firestore.collection(_usersCollection).doc(uid).update({
      'displayName': trimmed,
      'avatarInitials': userInitials(trimmed),
    });
  }

  Future<void> claimUsername(String uid, String usernameRaw) async {
    final usernameResult = validateUsername(usernameRaw);
    if (usernameResult is! UsernameValid) {
      throw Exception((usernameResult as UsernameInvalid).error);
    }

    final usernameLower = usernameResult.normalized;
    final userRef = _firestore.collection(_usersCollection).doc(uid);
    final userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw Exception('Profile not found');
    }

    final existing = UserProfile.fromFirestore(userSnap.data()!);
    if (existing.username != null && existing.username!.isNotEmpty) {
      throw Exception('Username is already set');
    }

    if (!await isUsernameAvailable(usernameLower)) {
      throw Exception('That username is already taken');
    }

    final batch = _firestore.batch();
    batch.update(userRef, {
      'username': usernameLower,
      'usernameLower': usernameLower,
    });
    batch.set(
      _firestore.collection(_usernamesCollection).doc(usernameLower),
      {
        'uid': uid,
        'usernameLower': usernameLower,
        'createdAt': FieldValue.serverTimestamp(),
      },
    );
    await batch.commit();
  }

  Future<void> touchLastLogin(String uid) async {
    final ref = _firestore.collection(_usersCollection).doc(uid);
    final snap = await ref.get();
    if (!snap.exists) {
      return;
    }

    await ref.update({
      'lastLoginAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> ensureLegacyUserProfile(User user) async {
    final userRef = _firestore.collection(_usersCollection).doc(user.uid);
    final snap = await userRef.get();
    if (snap.exists) {
      return;
    }

    final displayName = user.displayName?.trim().isNotEmpty == true
        ? user.displayName!.trim()
        : user.email?.split('@').first ?? 'Musician';

    await userRef.set({
      'email': user.email ?? '',
      'displayName': displayName,
      'avatarInitials': userInitials(displayName),
      'role': 'musician',
      'createdAt': FieldValue.serverTimestamp(),
      'lastLoginAt': FieldValue.serverTimestamp(),
    });
  }
}
