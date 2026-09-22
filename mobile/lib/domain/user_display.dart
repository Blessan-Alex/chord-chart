String userInitials(String name) {
  final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
  if (words.isEmpty) {
    return '?';
  }
  if (words.length == 1) {
    return words.first.substring(0, words.first.length.clamp(0, 2)).toUpperCase();
  }
  return '${words[0][0]}${words[1][0]}'.toUpperCase();
}

String userDisplayName(String? displayName, String? email) {
  if (displayName != null && displayName.trim().isNotEmpty) {
    return displayName.trim();
  }
  if (email != null && email.isNotEmpty) {
    return email.split('@').first;
  }
  return 'Guest';
}
