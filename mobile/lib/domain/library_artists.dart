import 'package:lf_chords/data/models/song_index_entry.dart';

List<String> collectLibraryArtists(List<SongIndexEntry> entries) {
  final byLowerCase = <String, String>{};

  for (final entry in entries) {
    final name = entry.artist.trim();
    if (name.isEmpty) {
      continue;
    }
    final key = name.toLowerCase();
    byLowerCase.putIfAbsent(key, () => name);
  }

  final artists = byLowerCase.values.toList()..sort();
  return artists;
}

bool artistMatchesFilter(String? entryArtist, String filter) {
  if (filter.trim().isEmpty) {
    return true;
  }
  return (entryArtist ?? '').trim().toLowerCase() ==
      filter.trim().toLowerCase();
}

bool isArtistFilterValid(String filter, List<String> availableArtists) {
  if (filter.trim().isEmpty) {
    return true;
  }
  return availableArtists.any((name) => artistMatchesFilter(name, filter));
}
