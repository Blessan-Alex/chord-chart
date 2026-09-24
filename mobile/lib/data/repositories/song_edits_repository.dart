import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lf_chords/data/mappers/section_firestore_mapper.dart';
import 'package:lf_chords/data/models/admin_models.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/data/repositories/song_index_repository.dart';
import 'package:lf_chords/data/repositories/songs_admin_repository.dart';
import 'package:lf_chords/domain/chord_marks.dart';
import 'package:lf_chords/domain/song_index_admin.dart';
import 'package:lf_chords/domain/song_validation.dart';

const _maxArchivedVersions = 10;

int _archiveSortMillis(Map<String, dynamic> data) {
  final published = data['publishedAt'];
  if (published is Timestamp) {
    return published.millisecondsSinceEpoch;
  }
  final created = data['createdAt'];
  if (created is Timestamp) {
    return created.millisecondsSinceEpoch;
  }
  return 0;
}

class SongEditsRepository {
  SongEditsRepository(
    this._firestore,
    this._songsAdmin,
    this._indexRepo,
  );

  final FirebaseFirestore _firestore;
  final SongsAdminRepository _songsAdmin;
  final SongIndexRepository _indexRepo;

  CollectionReference<Map<String, dynamic>> get _edits =>
      _firestore.collection('songEdits');

  Future<SongEdit?> getSongEdit(String editId) async {
    final snap = await _edits.doc(editId).get();
    if (!snap.exists) {
      return null;
    }
    return SongEdit.fromMap(snap.id, snap.data()!);
  }

  Future<SongEdit?> getDraftForSong(String songId) async {
    final snap = await _edits
        .where('songId', isEqualTo: songId)
        .where('status', isEqualTo: 'draft')
        .limit(1)
        .get();
    if (snap.docs.isEmpty) {
      return null;
    }
    final doc = snap.docs.first;
    return SongEdit.fromMap(doc.id, doc.data());
  }

  Future<SongEdit?> reconcileDraftWithSong(
    String editId,
    int songVersion,
  ) async {
    final draft = await getSongEdit(editId);
    if (draft == null || draft.status != 'draft') {
      return draft;
    }
    if (draft.baseVersion == songVersion) {
      return draft;
    }
    await _edits.doc(editId).update({
      'baseVersion': songVersion,
      'version': songVersion + 1,
    });
    return getSongEdit(editId);
  }

  Future<SongEdit> createDraft(String songId, String editedBy) async {
    final songDoc = await _songsAdmin.getSongDocument(songId);
    if (songDoc == null || songDoc['status'] != 'active') {
      throw Exception('Song not found: $songId');
    }

    final existing = await getDraftForSong(songId);
    if (existing != null) {
      final version = (songDoc['version'] as num?)?.toInt() ?? 0;
      final reconciled = await reconcileDraftWithSong(existing.id, version);
      if (reconciled == null) {
        throw Exception('Draft not found');
      }
      return reconciled;
    }

    final version = (songDoc['version'] as num?)?.toInt() ?? 1;
    final ref = _edits.doc();
    await ref.set({
      'songId': songId,
      'status': 'draft',
      'baseVersion': version,
      'title': songDoc['title'],
      'originalKey': songDoc['originalKey'],
      'sections': songDoc['sections'],
      'notes': songDoc['notes'],
      'version': version + 1,
      'editedBy': editedBy,
      'createdAt': FieldValue.serverTimestamp(),
      'publishedAt': null,
    });

    final created = await getSongEdit(ref.id);
    if (created == null) {
      throw Exception('Failed to read created draft');
    }
    return normalizeDraft(created);
  }

  SongEdit normalizeDraft(SongEdit draft) {
    return SongEdit(
      id: draft.id,
      songId: draft.songId,
      status: draft.status,
      baseVersion: draft.baseVersion,
      version: draft.version,
      title: draft.title,
      originalKey: draft.originalKey,
      sections: normalizeSections(draft.sections),
      notes: draft.notes,
      editedBy: draft.editedBy,
    );
  }

  Future<void> updateDraft(
    String editId, {
    String? title,
    String? originalKey,
    List<Section>? sections,
    String? notes,
    bool patchNotes = false,
  }) async {
    final existing = await getSongEdit(editId);
    if (existing == null || existing.status != 'draft') {
      throw Exception('Draft not found');
    }

    final nextTitle = title ?? existing.title;
    final nextKey = originalKey ?? existing.originalKey;
    final nextSections = sections != null
        ? normalizeSections(sections)
        : existing.sections;

    assertValidSongInput(
      title: nextTitle,
      originalKey: nextKey,
      sections: nextSections,
    );

    final updates = <String, dynamic>{};
    if (title != null) {
      updates['title'] = title.trim();
    }
    if (originalKey != null) {
      updates['originalKey'] = originalKey;
    }
    if (sections != null) {
      updates['sections'] = sectionsToFirestore(nextSections);
    }
    if (patchNotes) {
      final trimmed = notes?.trim() ?? '';
      updates['notes'] = trimmed.isEmpty ? null : trimmed;
    }
    if (updates.isEmpty) {
      return;
    }
    await _edits.doc(editId).update(updates);
  }

  Future<void> discardDraft(String editId) async {
    final existing = await getSongEdit(editId);
    if (existing == null || existing.status != 'draft') {
      throw Exception('Draft not found');
    }
    await _edits.doc(editId).delete();
  }

  Future<String> publishDraft(
    String editId,
    String editedBy, {
    String? artist,
    List<String>? tags,
  }) async {
    late String songId;

    await _firestore.runTransaction((tx) async {
      final editRef = _edits.doc(editId);
      final editSnap = await tx.get(editRef);
      if (!editSnap.exists) {
        throw Exception('Draft not found');
      }
      final editData = editSnap.data()!;
      if (editData['status'] != 'draft') {
        throw Exception('Draft not found');
      }

      songId = editData['songId'] as String;
      final songRef = _firestore.collection('songs').doc(songId);
      final songSnap = await tx.get(songRef);
      if (!songSnap.exists) {
        throw Exception('Song not found: $songId');
      }

      final songData = songSnap.data()!;
      final songVersion = (songData['version'] as num?)?.toInt() ?? 0;
      final baseVersion = (editData['baseVersion'] as num?)?.toInt() ?? 0;
      if (songVersion != baseVersion) {
        throw DraftVersionConflictError();
      }

      final draftSections = (editData['sections'] as List?)
              ?.whereType<Map>()
              .map((e) => Section.fromMap(Map<String, dynamic>.from(e)))
              .toList() ??
          const <Section>[];
      final publishedSections =
          serializeSectionsForPublish(normalizeSections(draftSections));

      final archiveRef = _edits.doc();
      tx.set(archiveRef, {
        'songId': songId,
        'status': 'archived',
        'baseVersion': songVersion,
        'title': songData['title'],
        'originalKey': songData['originalKey'],
        'sections': songData['sections'],
        'notes': songData['notes'],
        'version': songVersion,
        'editedBy': editedBy,
        'createdAt': FieldValue.serverTimestamp(),
        'publishedAt': FieldValue.serverTimestamp(),
      });

      final songUpdates = <String, dynamic>{
        'title': editData['title'],
        'originalKey': editData['originalKey'],
        'sections': sectionsToFirestore(publishedSections),
        'notes': editData['notes'],
        'version': editData['version'],
        'updatedAt': FieldValue.serverTimestamp(),
      };
      if (artist != null) {
        songUpdates['artist'] = artist.trim();
      }
      if (tags != null) {
        songUpdates['tags'] = tags;
      }
      tx.update(songRef, songUpdates);
      tx.delete(editRef);
    });

    final archives = await _edits
        .where('songId', isEqualTo: songId)
        .where('status', isEqualTo: 'archived')
        .get();
    if (archives.docs.length > _maxArchivedVersions) {
      final sorted = archives.docs.toList()
        ..sort((a, b) {
          final aMs = _archiveSortMillis(a.data());
          final bMs = _archiveSortMillis(b.data());
          return bMs.compareTo(aMs);
        });
      for (final doc in sorted.skip(_maxArchivedVersions)) {
        await doc.reference.delete();
      }
    }

    final songDoc = await _songsAdmin.getSongDocument(songId);
    if (songDoc != null) {
      final sections = (songDoc['sections'] as List?)
              ?.whereType<Map>()
              .map((e) => Section.fromMap(Map<String, dynamic>.from(e)))
              .toList() ??
          const <Section>[];
      await _indexRepo.upsertSongIndexEntry(
        songToIndexEntry(
          id: songId,
          title: songDoc['title'] as String? ?? '',
          artist: songDoc['artist'] as String? ?? '',
          originalKey: songDoc['originalKey'] as String? ?? 'C',
          tags: (songDoc['tags'] as List?)?.whereType<String>().toList() ??
              const [],
          sections: sections,
          updatedAtMs: DateTime.now().millisecondsSinceEpoch,
        ),
      );
    }

    return songId;
  }
}
