import 'package:lf_chords/domain/validation.dart';

/// Suggest a valid username from Google/email profile data.
String suggestUsername(String? email, String? displayName) {
  if (displayName != null && displayName.trim().isNotEmpty) {
    final fromName = normalizeUsername(
      displayName.trim().replaceAll(RegExp(r'\s+'), '_'),
    ).replaceAll(RegExp(r'[^a-z0-9_]'), '');
    if (fromName.length >= 3) {
      return fromName.substring(0, fromName.length.clamp(0, 20));
    }
  }

  if (email != null && email.isNotEmpty) {
    final prefix = email.split('@').first;
    final normalized =
        normalizeUsername(prefix).replaceAll(RegExp(r'[^a-z0-9_]'), '');
    if (normalized.length >= 3) {
      return normalized.substring(0, normalized.length.clamp(0, 20));
    }
  }

  return '';
}
