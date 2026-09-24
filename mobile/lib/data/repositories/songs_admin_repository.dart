import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lf_chords/data/mappers/section_firestore_mapper.dart';
import 'package:lf_chords/data/models/admin_models.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/data/models/song.dart';
import 'package:lf_chords/data/repositories/song_index_repository.dart';
import 'package:lf_chords/domain/chord_marks.dart';
import 'package:lf_chords/domain/song_id.dart';
import 'package:lf_chords/domain/song_index_admin.dart';
import 'package:lf_chords/domain/song_validation.dart';

class SongsAdminRepository {
  SongsAdminRepository(this._firestore, this._indexRepo);

  final FirebaseFirestore _firestore;
  final SongIndexRepository _indexRepo;

  Future<Song?> getActiveSong(String songId) async {
    final snap = await _firestore.collection('songs').doc(songId).get();
    if (!snap.exists) {
      return null;
    }
    final data = snap.data();
    if (data == null || data['status'] != 'active') {
      return null;
    }
    return Song.fromMap(snap.id, data);
  }

  Future<Map<String, dynamic>?> getSongDocument(String songId) async {
    final snap = await _firestore.collection('songs').doc(songId).get();
    if (!snap.exists) {
      return null;
    }
    return snap.data();
  }

  Future<CreatedSong> createSong({
    required String title,
    String artist = '',
    required String originalKey,
    required List<Section> sections,
    List<String> tags = const [],
    required String createdBy,
    String? explicitId,
  }) async {
    assertValidSongInput(
      title: title,
      originalKey: originalKey,
      sections: sections,
    );

    final id = resolveSongId(title, explicitId: explicitId);
    final normalized = normalizeSections(sections);
    final ref = _firestore.collection('songs').doc(id);
    await ref.set({
      'title': title.trim(),
      'artist': artist.trim(),
      'originalKey': originalKey,
      'status': 'active',
      'tempo': null,
      'tags': tags,
      'sections': sectionsToFirestore(normalized),
      'ccli': null,
      'copyright': null,
      'notes': null,
      'version': 1,
      'createdBy': createdBy,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    final createdSnap = await ref.get();
    final data = createdSnap.data()!;
    final created = CreatedSong(
      id: createdSnap.id,
      title: data['title'] as String? ?? title,
      artist: data['artist'] as String? ?? '',
      originalKey: data['originalKey'] as String? ?? originalKey,
      tags: (data['tags'] as List?)?.whereType<String>().toList() ?? tags,
      sections: normalized,
      version: (data['version'] as num?)?.toInt() ?? 1,
    );

    await _indexRepo.upsertSongIndexEntry(
      songToIndexEntry(
        id: created.id,
        title: created.title,
        artist: created.artist,
        originalKey: created.originalKey,
        tags: created.tags,
        sections: created.sections,
        updatedAtMs: DateTime.now().millisecondsSinceEpoch,
      ),
    );

    return created;
  }

  Future<void> updateSongMetadata({
    required String songId,
    String? artist,
    List<String>? tags,
  }) async {
    final updates = <String, dynamic>{
      'updatedAt': FieldValue.serverTimestamp(),
    };
    if (artist != null) {
      updates['artist'] = artist.trim();
    }
    if (tags != null) {
      updates['tags'] = tags;
    }
    if (updates.length == 1) {
      return;
    }
    await _firestore.collection('songs').doc(songId).update(updates);

    final doc = await getSongDocument(songId);
    if (doc == null) {
      return;
    }
    if (artist != null || tags != null) {
      final song = Song.fromMap(songId, doc);
      await _indexRepo.upsertSongIndexEntry(
        songToIndexEntry(
          id: songId,
          title: song.title,
          artist: doc['artist'] as String? ?? '',
          originalKey: song.originalKey,
          tags: (doc['tags'] as List?)?.whereType<String>().toList() ?? const [],
          sections: song.sections,
          updatedAtMs: DateTime.now().millisecondsSinceEpoch,
        ),
      );
    }
  }

  Future<void> archiveSong(String songId) async {
    await _firestore.collection('songs').doc(songId).update({
      'status': 'archived',
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await _indexRepo.removeSongIndexEntry(songId);
  }
}
