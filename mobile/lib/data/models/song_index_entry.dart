import 'package:lf_chords/domain/keys.dart';

class SongIndexEntry {
  const SongIndexEntry({
    required this.id,
    required this.title,
    required this.artist,
    required this.key,
    required this.tags,
    this.searchText,
    this.updatedAtMs = 0,
  });

  final String id;
  final String title;
  final String artist;
  final String key;
  final List<String> tags;
  final String? searchText;
  final int updatedAtMs;

  factory SongIndexEntry.fromMap(Map<String, dynamic> data) {
    final rawKey = data['key'];
    final key = rawKey is String && isValidKey(rawKey) ? rawKey : 'C';
    final rawTags = data['tags'];
    return SongIndexEntry(
      id: data['id'] as String? ?? '',
      title: data['title'] as String? ?? '',
      artist: data['artist'] as String? ?? '',
      key: key,
      tags: rawTags is List
          ? rawTags.whereType<String>().toList(growable: false)
          : const [],
      searchText: data['searchText'] as String?,
      updatedAtMs: (data['updatedAtMs'] as num?)?.toInt() ?? 0,
    );
  }
}
