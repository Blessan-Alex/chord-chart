import 'package:lf_chords/data/models/section.dart';

class SongEdit {
  const SongEdit({
    required this.id,
    required this.songId,
    required this.status,
    required this.baseVersion,
    required this.version,
    required this.title,
    required this.originalKey,
    required this.sections,
    this.notes,
    required this.editedBy,
  });

  final String id;
  final String songId;
  final String status;
  final int baseVersion;
  final int version;
  final String title;
  final String originalKey;
  final List<Section> sections;
  final String? notes;
  final String editedBy;

  factory SongEdit.fromMap(String id, Map<String, dynamic> data) {
    final rawSections = data['sections'];
    return SongEdit(
      id: id,
      songId: data['songId'] as String? ?? '',
      status: data['status'] as String? ?? 'draft',
      baseVersion: (data['baseVersion'] as num?)?.toInt() ?? 0,
      version: (data['version'] as num?)?.toInt() ?? 0,
      title: data['title'] as String? ?? '',
      originalKey: data['originalKey'] as String? ?? 'C',
      sections: rawSections is List
          ? rawSections
              .whereType<Map>()
              .map((e) => Section.fromMap(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      notes: data['notes'] as String?,
      editedBy: data['editedBy'] as String? ?? '',
    );
  }
}

class DraftVersionConflictError implements Exception {
  @override
  String toString() => 'Song was modified since draft was created';
}

class AdminStats {
  const AdminStats({
    required this.songCount,
    required this.playlistCount,
    required this.groupCount,
  });

  final int songCount;
  final int playlistCount;
  final int groupCount;

  static const empty = AdminStats(
    songCount: 0,
    playlistCount: 0,
    groupCount: 0,
  );
}

class CreatedSong {
  const CreatedSong({
    required this.id,
    required this.title,
    required this.artist,
    required this.originalKey,
    required this.tags,
    required this.sections,
    required this.version,
  });

  final String id;
  final String title;
  final String artist;
  final String originalKey;
  final List<String> tags;
  final List<Section> sections;
  final int version;
}
