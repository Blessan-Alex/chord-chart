final RegExp usernameRegex = RegExp(r'^[a-z0-9_]{3,20}$');

String normalizeUsername(String value) {
  return value.trim().replaceFirst(RegExp(r'^@+'), '').toLowerCase();
}

sealed class UsernameValidationResult {
  const UsernameValidationResult();
}

class UsernameValid extends UsernameValidationResult {
  const UsernameValid(this.normalized);
  final String normalized;
}

class UsernameInvalid extends UsernameValidationResult {
  const UsernameInvalid(this.error);
  final String error;
}

UsernameValidationResult validateUsername(String username) {
  final normalized = normalizeUsername(username);

  if (normalized.isEmpty) {
    return const UsernameInvalid('Username is required');
  }

  if (normalized.length < 3 || normalized.length > 20) {
    return const UsernameInvalid('Username must be 3–20 characters');
  }

  if (!usernameRegex.hasMatch(normalized)) {
    return const UsernameInvalid(
      'Use lowercase letters, numbers, and underscores only',
    );
  }

  return UsernameValid(normalized);
}
