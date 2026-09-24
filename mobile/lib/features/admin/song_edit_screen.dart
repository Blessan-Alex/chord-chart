import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/data/models/admin_models.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/chord_marks.dart';
import 'package:lf_chords/domain/chord_source_sync.dart';
import 'package:lf_chords/features/admin/admin_route_gate.dart';
import 'package:lf_chords/features/admin/widgets/admin_song_composer.dart';
import 'package:lf_chords/providers/admin_providers.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/song_index_providers.dart';

class SongEditScreen extends ConsumerStatefulWidget {
  const SongEditScreen({super.key, required this.songId});

  final String songId;

  @override
  ConsumerState<SongEditScreen> createState() => _SongEditScreenState();
}

class _SongEditScreenState extends ConsumerState<SongEditScreen> {
  final _composerKey = GlobalKey<AdminSongComposerState>();
  SongEdit? _draft;
  var _title = '';
  var _artist = '';
  var _originalKey = 'C';
  var _tags = <String>[];
  var _notes = '';
  var _sections = <Section>[];
  var _loading = true;
  var _busy = false;
  String? _error;
  String? _notice;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDraft());
  }

  Future<void> _loadDraft() async {
    final session = ref.read(authSessionProvider);
    if (session.user == null || !session.isAdmin) {
      setState(() => _loading = false);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final songsAdmin = ref.read(songsAdminRepositoryProvider);
      final edits = ref.read(songEditsRepositoryProvider);
      final songDoc = await songsAdmin.getSongDocument(widget.songId);
      if (songDoc == null) {
        throw Exception('Song not found');
      }
      var draft = await edits.getDraftForSong(widget.songId);
      draft ??= await edits.createDraft(widget.songId, session.user!.uid);
      final version = (songDoc['version'] as num?)?.toInt() ?? 1;
      final reconciled =
          await edits.reconcileDraftWithSong(draft.id, version);
      draft = reconciled ?? draft;

      setState(() {
        _draft = edits.normalizeDraft(draft!);
        _title = _draft!.title;
        _artist = songDoc['artist'] as String? ?? '';
        _tags = (songDoc['tags'] as List?)?.whereType<String>().toList() ?? [];
        _originalKey = _draft!.originalKey;
        _notes = _draft!.notes ?? '';
        _sections = normalizeSections(_draft!.sections);
        _loading = false;
      });
    } catch (err) {
      setState(() {
        _error = err.toString();
        _loading = false;
      });
    }
  }

  List<Section>? _resolveSections() {
    final resolved = _composerKey.currentState?.getSectionsForSave();
    if (resolved == null) {
      setState(() => _error = 'Could not read chart data.');
      return null;
    }
    if (resolved is FlushError) {
      setState(() => _error = resolved.message);
      return null;
    }
    final sections = (resolved as FlushOk).sections;
    setState(() => _sections = sections);
    return sections;
  }

  Future<void> _saveDraft() async {
    final draft = _draft;
    if (draft == null) {
      return;
    }
    final sections = _resolveSections();
    if (sections == null) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      final edits = ref.read(songEditsRepositoryProvider);
      await edits.updateDraft(
        draft.id,
        title: _title.trim(),
        originalKey: _originalKey,
        sections: sections,
        notes: _notes,
        patchNotes: true,
      );
      try {
        await ref.read(songsAdminRepositoryProvider).updateSongMetadata(
              songId: widget.songId,
              artist: _artist.trim(),
              tags: _tags,
            );
      } catch (metaErr) {
        setState(() => _notice = 'Draft saved; metadata: $metaErr');
      }
      await ref.read(songIndexControllerProvider.notifier).retry();
      if (mounted && _notice == null) {
        context.go(RoutePaths.song(widget.songId));
      }
    } catch (err) {
      setState(() => _error = err.toString());
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _publish() async {
    final draft = _draft;
    final session = ref.read(authSessionProvider);
    if (draft == null || session.user == null) {
      return;
    }
    final sections = _resolveSections();
    if (sections == null) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      final edits = ref.read(songEditsRepositoryProvider);
      await edits.updateDraft(
        draft.id,
        title: _title.trim(),
        originalKey: _originalKey,
        sections: sections,
        notes: _notes,
        patchNotes: true,
      );
      final songDoc =
          await ref.read(songsAdminRepositoryProvider).getSongDocument(widget.songId);
      var draftToPublish = draft;
      if (songDoc != null) {
        final version = (songDoc['version'] as num?)?.toInt() ?? 1;
        final reconciled =
            await edits.reconcileDraftWithSong(draft.id, version);
        if (reconciled != null) {
          draftToPublish = reconciled;
          setState(() => _draft = reconciled);
        }
      }
      await edits.publishDraft(
        draftToPublish.id,
        session.user!.uid,
        artist: _artist.trim(),
        tags: _tags,
      );
      await ref.read(songIndexControllerProvider.notifier).retry();
      if (mounted) {
        context.go(RoutePaths.song(widget.songId));
      }
    } on DraftVersionConflictError {
      setState(() {
        _error =
            'The song changed while publishing. Reload this page and try again.';
      });
    } catch (err) {
      setState(() => _error = err.toString());
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _discard() async {
    final draft = _draft;
    if (draft == null) {
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Discard draft?'),
        content: const Text('Unsaved changes in this draft will be lost.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Discard'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(songEditsRepositoryProvider).discardDraft(draft.id);
      if (mounted) {
        context.go(RoutePaths.song(widget.songId));
      }
    } catch (err) {
      setState(() => _error = err.toString());
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdminRouteGate(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Edit song'),
          actions: [
            TextButton(
              onPressed: _busy ? null : _saveDraft,
              child: const Text('Save draft'),
            ),
            TextButton(
              onPressed: _busy ? null : _publish,
              child: const Text('Publish'),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _draft == null
                ? Center(child: Text(_error ?? 'Could not open draft.'))
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      AdminSongComposer(
                        key: _composerKey,
                        title: _title,
                        onTitleChanged: (v) => setState(() => _title = v),
                        artist: _artist,
                        onArtistChanged: (v) => setState(() => _artist = v),
                        originalKey: _originalKey,
                        onOriginalKeyChanged: (v) =>
                            setState(() => _originalKey = v),
                        tags: _tags,
                        onTagsChanged: (v) => setState(() => _tags = v),
                        sections: _sections,
                        onSectionsChanged: (v) => setState(() => _sections = v),
                        notes: _notes,
                        onNotesChanged: (v) => setState(() => _notes = v),
                      ),
                      if (_error != null)
                        Text(_error!,
                            style: TextStyle(
                                color: Theme.of(context).colorScheme.error)),
                      if (_notice != null) Text(_notice!),
                      const SizedBox(height: 16),
                      OutlinedButton(
                        onPressed: _busy ? null : _discard,
                        child: const Text('Discard draft'),
                      ),
                    ],
                  ),
      ),
    );
  }
}
