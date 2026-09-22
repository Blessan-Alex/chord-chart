import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/data/models/song_index_entry.dart';
import 'package:lf_chords/providers/song_index_providers.dart';

class SongPlaceholderScreen extends ConsumerStatefulWidget {
  const SongPlaceholderScreen({super.key, required this.songId});

  final String songId;

  @override
  ConsumerState<SongPlaceholderScreen> createState() =>
      _SongPlaceholderScreenState();
}

class _SongPlaceholderScreenState extends ConsumerState<SongPlaceholderScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _recordRecent());
  }

  Future<void> _recordRecent() async {
    SongIndexEntry? entry;
    for (final e in ref.read(songIndexEntriesProvider)) {
      if (e.id == widget.songId) {
        entry = e;
        break;
      }
    }
    if (entry == null) {
      return;
    }
    await ref.read(recentSongsRepositoryProvider).recordRecentSong(
          songId: entry.id,
          title: entry.title,
          artist: entry.artist,
          key: entry.key,
        );
    if (!mounted) {
      return;
    }
    ref.invalidate(recentSongsProvider);
  }

  @override
  Widget build(BuildContext context) {
    SongIndexEntry? entry;
    for (final e in ref.watch(songIndexEntriesProvider)) {
      if (e.id == widget.songId) {
        entry = e;
        break;
      }
    }

    final title = entry?.title ?? widget.songId;

    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.pop()),
        title: Text(title),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.music_note_outlined, size: 64),
              const SizedBox(height: 16),
              Text(
                title,
                style: Theme.of(context).textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              if (entry != null && entry.artist.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(entry.artist),
              ],
              const SizedBox(height: 24),
              const Text('Chart view coming in Phase 3.'),
            ],
          ),
        ),
      ),
    );
  }
}
