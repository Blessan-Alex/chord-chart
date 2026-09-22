import 'package:lf_chords/data/models/song_index_entry.dart';
import 'package:lf_chords/domain/library_artists.dart';

List<String> tokenizeSearchQuery(String query) {
  return query.trim().toLowerCase().split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList();
}

int _scoreToken(SongIndexEntry entry, String token) {
  final title = entry.title.toLowerCase();
  final artist = entry.artist.toLowerCase();
  final searchText = (entry.searchText ?? '').toLowerCase();
  final tags = entry.tags.map((t) => t.toLowerCase()).toList();
  final titleWords = title.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();

  if (title == token) {
    return 400;
  }
  if (title.startsWith(token)) {
    return 200;
  }
  if (titleWords.any((word) => word.startsWith(token))) {
    return 150;
  }
  if (title.contains(token)) {
    return 80;
  }
  if (artist.contains(token)) {
    return 60;
  }
  if (tags.any((tag) => tag.contains(token))) {
    return 40;
  }
  if (searchText.contains(token)) {
    return 30;
  }
  return 0;
}

int _scoreEntry(SongIndexEntry entry, List<String> tokens) {
  if (tokens.isEmpty) {
    return 0;
  }

  final fullQuery = tokens.join(' ');
  final title = entry.title.toLowerCase();
  final artist = entry.artist.toLowerCase();
  final searchText = (entry.searchText ?? '').toLowerCase();
  final tags = entry.tags.map((t) => t.toLowerCase()).toList();

  var score = 0;

  if (title == fullQuery) {
    score += 1000;
  } else if (title.startsWith(fullQuery)) {
    score += 500;
  } else if (title.contains(fullQuery)) {
    score += 300;
  }

  if (artist.startsWith(fullQuery)) {
    score += 200;
  } else if (artist.contains(fullQuery)) {
    score += 100;
  }

  if (searchText.contains(fullQuery)) {
    score += 50;
  }

  if (tags.any((tag) => tag.contains(fullQuery))) {
    score += 40;
  }

  for (final token in tokens) {
    final tokenScore = _scoreToken(entry, token);
    if (tokenScore == 0) {
      return -1;
    }
    score += tokenScore;
  }

  return score;
}

List<SongIndexEntry> _applyFilters(
  List<SongIndexEntry> entries, {
  String? keyFilter,
  String? tagFilter,
  String? artistFilter,
}) {
  var results = entries;

  if (keyFilter != null && keyFilter.isNotEmpty) {
    results = results.where((entry) => entry.key == keyFilter).toList();
  }

  if (tagFilter != null && tagFilter.isNotEmpty) {
    results = results.where((entry) => entry.tags.contains(tagFilter)).toList();
  }

  if (artistFilter != null && artistFilter.trim().isNotEmpty) {
    results = results
        .where((entry) => artistMatchesFilter(entry.artist, artistFilter))
        .toList();
  }

  return results;
}

List<SongIndexEntry> rankSongIndexResults(
  List<SongIndexEntry> entries,
  String query, {
  String? keyFilter,
  String? tagFilter,
  String? artistFilter,
}) {
  final filtered = _applyFilters(
    entries,
    keyFilter: keyFilter,
    tagFilter: tagFilter,
    artistFilter: artistFilter,
  );
  final tokens = tokenizeSearchQuery(query);

  if (tokens.isEmpty) {
    return sortLibraryEntries(filtered);
  }

  final scored = <({SongIndexEntry entry, int score})>[];
  for (final entry in filtered) {
    final score = _scoreEntry(entry, tokens);
    if (score >= 0) {
      scored.add((entry: entry, score: score));
    }
  }

  scored.sort((a, b) {
    final byScore = b.score.compareTo(a.score);
    if (byScore != 0) {
      return byScore;
    }
    return a.entry.title.compareTo(b.entry.title);
  });

  return scored.map((s) => s.entry).toList();
}

/// Alias matching web `filterSongIndex`.
List<SongIndexEntry> filterSongIndex(
  List<SongIndexEntry> entries,
  String query, {
  String? keyFilter,
  String? tagFilter,
  String? artistFilter,
}) {
  return rankSongIndexResults(
    entries,
    query,
    keyFilter: keyFilter,
    tagFilter: tagFilter,
    artistFilter: artistFilter,
  );
}

int compareLibraryEntries(SongIndexEntry a, SongIndexEntry b) {
  if (b.updatedAtMs != a.updatedAtMs) {
    return b.updatedAtMs.compareTo(a.updatedAtMs);
  }
  return a.title.compareTo(b.title);
}

List<SongIndexEntry> sortLibraryEntries(List<SongIndexEntry> entries) {
  final copy = List<SongIndexEntry>.from(entries);
  copy.sort(compareLibraryEntries);
  return copy;
}

bool entryMatchesQuery(SongIndexEntry entry, String query) {
  final tokens = tokenizeSearchQuery(query);
  if (tokens.isEmpty) {
    return true;
  }
  return _scoreEntry(entry, tokens) >= 0;
}
