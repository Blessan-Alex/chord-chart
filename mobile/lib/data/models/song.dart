import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/engine.dart';

class Song {
  const Song({
    required this.id,
    required this.title,
    required this.originalKey,
    this.sections = const [],
  });

  final String id;
  final String title;
  final String originalKey;
  final List<Section> sections;

  factory Song.fromMap(String id, Map<String, dynamic> map) {
    final key = map['originalKey'];
    final rawSections = map['sections'];
    return Song(
      id: id,
      title: map['title'] as String? ?? '',
      originalKey: key is String && isValidKey(key) ? key : 'C',
      sections: rawSections is List
          ? rawSections
              .whereType<Map>()
              .map((e) => Section.fromMap(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }
}

enum SongViewMode { chords, numbers }

class LiveSongPayload {
  const LiveSongPayload({
    this.song,
    this.artist = '',
    this.version,
    this.tags = const [],
    this.ready = false,
  });

  final Song? song;
  final String artist;
  final int? version;
  final List<String> tags;
  final bool ready;

  static const empty = LiveSongPayload(ready: true);
}
