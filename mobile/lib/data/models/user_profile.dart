import 'package:cloud_firestore/cloud_firestore.dart';

class UserProfile {
  const UserProfile({
    required this.email,
    required this.displayName,
    required this.role,
    this.username,
    this.usernameLower,
    this.avatarInitials,
    this.createdAt,
    this.lastLoginAt,
  });

  final String email;
  final String displayName;
  final String? username;
  final String? usernameLower;
  final String role;
  final String? avatarInitials;
  final DateTime? createdAt;
  final DateTime? lastLoginAt;

  factory UserProfile.fromFirestore(Map<String, dynamic> data) {
    return UserProfile(
      email: data['email'] as String? ?? '',
      displayName: data['displayName'] as String? ?? '',
      username: data['username'] as String?,
      usernameLower: data['usernameLower'] as String?,
      role: data['role'] as String? ?? 'musician',
      avatarInitials: data['avatarInitials'] as String?,
      createdAt: _timestampToDateTime(data['createdAt']),
      lastLoginAt: _timestampToDateTime(data['lastLoginAt']),
    );
  }

  static DateTime? _timestampToDateTime(Object? value) {
    if (value is Timestamp) {
      return value.toDate();
    }
    return null;
  }
}

class CreateUserProfileInput {
  const CreateUserProfileInput({
    required this.uid,
    required this.email,
    required this.displayName,
    required this.username,
  });

  final String uid;
  final String email;
  final String displayName;
  final String username;
}
