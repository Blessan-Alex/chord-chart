import 'dart:convert';

import 'package:lf_chords/domain/constants.dart';
import 'package:shared_preferences/shared_preferences.dart';

class RecentSongEntry {
  const RecentSongEntry({
    required this.songId,
    required this.title,
    required this.artist,
    required this.key,
    required this.viewedAt,
  });

  final String songId;
  final String title;
  final String artist;
  final String key;
  final int viewedAt;

  Map<String, dynamic> toJson() => {
        'songId': songId,
        'title': title,
        'artist': artist,
        'key': key,
        'viewedAt': viewedAt,
      };

  factory RecentSongEntry.fromJson(Map<String, dynamic> json) {
    return RecentSongEntry(
      songId: json['songId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      artist: json['artist'] as String? ?? '',
      key: json['key'] as String? ?? 'C',
      viewedAt: (json['viewedAt'] as num?)?.toInt() ?? 0,
    );
  }
}

List<RecentSongEntry> parseRecentSongs(String? raw) {
  if (raw == null || raw.isEmpty) {
    return const [];
  }
  try {
    final parsed = jsonDecode(raw);
    if (parsed is! List) {
      return const [];
    }
    return parsed
        .whereType<Map>()
        .map((e) => RecentSongEntry.fromJson(Map<String, dynamic>.from(e)))
        .where((e) => e.songId.isNotEmpty && e.title.isNotEmpty && e.key.isNotEmpty)
        .take(recentSongsMax)
        .toList();
  } catch (_) {
    return const [];
  }
}

List<RecentSongEntry> filterRecentByKnownIds(
  List<RecentSongEntry> entries,
  Set<String> validIds,
) {
  return entries.where((e) => validIds.contains(e.songId)).toList();
}

class RecentSongsRepository {
  RecentSongsRepository(this._prefs);

  final SharedPreferences _prefs;

  List<RecentSongEntry> getRecentSongs() {
    return parseRecentSongs(_prefs.getString(recentSongsStorageKey));
  }

  Future<void> recordRecentSong({
    required String songId,
    required String title,
    required String artist,
    required String key,
  }) async {
    final normalized = RecentSongEntry(
      songId: songId,
      title: title.trim().isEmpty ? 'Untitled' : title.trim(),
      artist: artist.trim(),
      key: key,
      viewedAt: DateTime.now().millisecondsSinceEpoch,
    );

    final next = [
      normalized,
      ...getRecentSongs().where((e) => e.songId != normalized.songId),
    ].take(recentSongsMax).toList();

    await _prefs.setString(
      recentSongsStorageKey,
      jsonEncode(next.map((e) => e.toJson()).toList()),
    );
  }
}
