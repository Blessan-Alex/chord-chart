import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/constants.dart';
import 'package:lf_chords/domain/playlist_access.dart';
import 'package:lf_chords/domain/session_navigation.dart';
import 'package:lf_chords/features/playlists/widgets/playlist_card.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/playlist_providers.dart';

class PlaylistsScreen extends ConsumerStatefulWidget {
  const PlaylistsScreen({super.key});

  @override
  ConsumerState<PlaylistsScreen> createState() => _PlaylistsScreenState();
}

class _PlaylistsScreenState extends ConsumerState<PlaylistsScreen> {
  String _search = '';

  List<PlaylistSession> _filter(List<PlaylistSession> sessions) {
    final q = _search.trim().toLowerCase();
    if (q.isEmpty) {
      return sessions;
    }
    return sessions
        .where((s) => s.title.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final uid = ref.watch(authControllerProvider).session.user?.uid ?? '';
    final async = ref.watch(playlistsForUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Playlists'),
        actions: [
          IconButton(
            onPressed: () => context.push(RoutePaths.playlistsNew),
            icon: const Icon(Icons.add),
            tooltip: 'New playlist',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(playlistsForUserProvider);
          await ref.read(playlistsForUserProvider.future);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            Text(
              'Set lists for rehearsals and services',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Search playlists…',
                border: OutlineInputBorder(),
              ),
              onChanged: (value) => setState(() => _search = value),
            ),
            const SizedBox(height: 24),
            async.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => Text('Could not load playlists. $error'),
              data: (playlists) {
                final filtered = _filter(playlists);
                final ownedDrafts = filtered
                    .where(
                      (s) =>
                          isPlaylistOwner(s, uid) && s.status == 'draft',
                    )
                    .toList();
                final sharedDrafts = filtered
                    .where(
                      (s) =>
                          s.status == 'draft' &&
                          !isPlaylistOwner(s, uid) &&
                          s.sharedWith.contains(uid),
                    )
                    .toList();
                final published =
                    filtered.where((s) => s.status == 'published').toList();

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (ownedDrafts.isNotEmpty) ...[
                      _sectionTitle('My private playlists'),
                      ...ownedDrafts.map(
                        (s) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: PlaylistCard(session: s, showStatus: true),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (sharedDrafts.isNotEmpty) ...[
                      _sectionTitle('Shared with me'),
                      ...sharedDrafts.map(
                        (s) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: PlaylistCard(session: s, showStatus: true),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    _sectionTitle('Public playlists'),
                    if (published.isEmpty)
                      _emptyPublic(context)
                    else ...[
                      if (published.length >= publishedPlaylistCap)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            'Showing the $publishedPlaylistCap most recent public '
                            'playlists. Use search to narrow the list.',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                      ...published.map(
                        (s) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: PlaylistCard(session: s),
                        ),
                      ),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(RoutePaths.playlistsNew),
        icon: const Icon(Icons.add),
        label: const Text('New playlist'),
      ),
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _emptyPublic(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          const Text('No playlists yet', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          const Text('Create a playlist to build your first set list.'),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => context.push(RoutePaths.playlistsNew),
            child: const Text('Create playlist'),
          ),
        ],
      ),
    );
  }
}
