import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/domain/playlist_labels.dart';
import 'package:lf_chords/domain/session_display.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/playlist_providers.dart';

class AddToPlaylistSheet extends ConsumerStatefulWidget {
  const AddToPlaylistSheet({
    super.key,
    required this.songId,
    required this.songTitle,
  });

  final String songId;
  final String songTitle;

  @override
  ConsumerState<AddToPlaylistSheet> createState() =>
      _AddToPlaylistSheetState();
}

class _AddToPlaylistSheetState extends ConsumerState<AddToPlaylistSheet> {
  String? _addingId;
  String? _error;

  Future<void> _add(String playlistId) async {
    final uid = ref.read(authControllerProvider).session.user?.uid;
    if (uid == null) {
      return;
    }
    setState(() {
      _addingId = playlistId;
      _error = null;
    });
    try {
      await ref.read(sessionSongsRepositoryProvider).addSongToSession(
            sessionId: playlistId,
            songId: widget.songId,
            songTitle: widget.songTitle,
            addedBy: uid,
          );
      invalidateUserPlaylistCaches(ref);
      ref.invalidate(playlistSessionProvider(playlistId));
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      setState(() {
        _error = error.toString();
        _addingId = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final playlists = ref.watch(ownedPlaylistsProvider);

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.paddingOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Add to playlist',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                Text(widget.songTitle),
              ],
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          Flexible(
            child: playlists.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Could not load playlists.'),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      'No playlists yet. Create one from the Playlists page.',
                    ),
                  );
                }
                return ListView.builder(
                  shrinkWrap: true,
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final playlist = items[index];
                    return ListTile(
                      title: Text(playlist.title),
                      subtitle: Text(
                        '${formatPlaylistDateShort(playlist.date)}'
                        '${playlistVisibilitySuffix(playlist.status)}',
                      ),
                      onTap: _addingId != null
                          ? null
                          : () => _add(playlist.id),
                      trailing: _addingId == playlist.id
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : null,
                    );
                  },
                );
              },
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }
}
