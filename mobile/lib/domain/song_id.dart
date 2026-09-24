import 'dart:math';

String slugifyTitle(String title) {
  return title
      .toLowerCase()
      .trim()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
}

String createSongId() {
  final random = Random.secure();
  final suffix = List.generate(9, (_) => random.nextInt(36).toRadixString(36))
      .join();
  return 'song-${DateTime.now().millisecondsSinceEpoch}-$suffix';
}

String resolveSongId(String title, {String? explicitId}) {
  final trimmed = explicitId?.trim();
  if (trimmed != null && trimmed.isNotEmpty) {
    return trimmed;
  }
  final slug = slugifyTitle(title);
  if (slug.isNotEmpty) {
    return slug;
  }
  return createSongId();
}
