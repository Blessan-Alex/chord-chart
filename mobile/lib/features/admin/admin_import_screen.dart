import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/chord_source_sync.dart';
import 'package:lf_chords/features/admin/admin_route_gate.dart';
import 'package:lf_chords/features/admin/widgets/admin_song_composer.dart';
import 'package:lf_chords/providers/admin_providers.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/song_index_providers.dart';

class AdminImportScreen extends ConsumerStatefulWidget {
  const AdminImportScreen({super.key});

  @override
  ConsumerState<AdminImportScreen> createState() => _AdminImportScreenState();
}

class _AdminImportScreenState extends ConsumerState<AdminImportScreen> {
  final _composerKey = GlobalKey<AdminSongComposerState>();
  var _title = '';
  var _artist = '';
  var _originalKey = 'C';
  var _tags = <String>[];
  var _sections = [const Section(label: 'Verse 1', lines: [])];
  var _saving = false;
  String? _error;

  Future<void> _create() async {
    final session = ref.read(authSessionProvider);
    final user = session.user;
    if (user == null || !session.isAdmin) {
      return;
    }

    final composer = _composerKey.currentState;
    final resolved = composer?.getSectionsForSave();
    if (resolved == null) {
      setState(() => _error = 'Could not read chart data.');
      return;
    }
    if (resolved is FlushError) {
      setState(() => _error = resolved.message);
      return;
    }
    final sections = (resolved as FlushOk).sections;

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final created = await ref.read(songsAdminRepositoryProvider).createSong(
            title: _title,
            artist: _artist,
            originalKey: _originalKey,
            sections: sections,
            tags: _tags,
            createdBy: user.uid,
          );
      await ref.read(songIndexControllerProvider.notifier).retry();
      if (mounted) {
        context.go(RoutePaths.song(created.id));
      }
    } catch (err) {
      setState(() => _error = err.toString());
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdminRouteGate(
      child: Scaffold(
        appBar: AppBar(title: const Text('Add song')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            AdminSongComposer(
              key: _composerKey,
              title: _title,
              onTitleChanged: (v) => setState(() => _title = v),
              artist: _artist,
              onArtistChanged: (v) => setState(() => _artist = v),
              originalKey: _originalKey,
              onOriginalKeyChanged: (v) => setState(() => _originalKey = v),
              tags: _tags,
              onTagsChanged: (v) => setState(() => _tags = v),
              sections: _sections,
              onSectionsChanged: (v) => setState(() => _sections = v),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _create,
              child: Text(_saving ? 'Saving…' : 'Create song'),
            ),
          ],
        ),
      ),
    );
  }
}
