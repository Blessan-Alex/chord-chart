import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/auth_errors.dart';
import 'package:lf_chords/domain/constants.dart';
import 'package:lf_chords/domain/language_tags.dart';
import 'package:lf_chords/domain/library_browse.dart';
import 'package:lf_chords/domain/session_navigation.dart';
import 'package:lf_chords/features/library/widgets/library_filter_sheet.dart';
import 'package:lf_chords/features/library/widgets/library_pagination_bar.dart';
import 'package:lf_chords/features/library/widgets/recent_songs_section.dart';
import 'package:lf_chords/features/library/widgets/song_row.dart';
import 'package:lf_chords/features/playlists/widgets/playlist_card.dart';
import 'package:lf_chords/providers/group_providers.dart';
import 'package:lf_chords/providers/playlist_providers.dart';
import 'package:lf_chords/features/library/widgets/song_row_skeleton.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/song_index_providers.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openSong(String id) {
    context.push(RoutePaths.song(id));
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(artistFilterSyncProvider);

    final indexState = ref.watch(songIndexControllerProvider);
    final session = ref.watch(authControllerProvider).session;
    final filters = ref.watch(libraryFiltersProvider);
    final displayed = ref.watch(displayedLibraryResultsProvider);
    final libraryResults = ref.watch(libraryResultsProvider);
    final isBrowsingAll = ref.watch(isBrowsingAllProvider);
    final libraryCapped = ref.watch(libraryCappedProvider);
    final page = ref.watch(libraryPageProvider);
    final pageCount = ref.watch(libraryPageCountProvider);
    final showRecent = ref.watch(showRecentSongsProvider);
    final recent = ref.watch(recentSongsProvider);
    final artists = ref.watch(libraryArtistsProvider);
    final showSocialSections =
        session.user != null && isBrowsingAll && !indexState.loading;

    final filterButtonLabel = libraryFilterLabel(
      keyFilter: filters.keyFilter,
      languageFilter: filters.languageFilter,
      artistFilter: filters.artistFilter,
    );

    final songCountLine = indexState.loading && indexState.entries.isEmpty
        ? 'Loading…'
        : '${indexState.entries.length} songs';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(songIndexControllerProvider.notifier).retry(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              songCountLine,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 12),
            if (session.user == null)
              Card(
                child: ListTile(
                  title: const Text('Guest'),
                  subtitle: const Text(
                    'Sign in for playlists & groups',
                  ),
                  trailing: const Icon(Icons.login),
                  onTap: () => context.push(
                    '${RoutePaths.login}?next=${Uri.encodeComponent(RoutePaths.home)}',
                  ),
                ),
              ),
            if (session.user == null) const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      hintText: 'Search songs, artists, lyrics…',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onChanged: (value) => ref
                        .read(librarySearchQueryProvider.notifier)
                        .setQuery(value),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton.tonalIcon(
                  onPressed: () => showLibraryFilterSheet(
                    context,
                    keyFilter: filters.keyFilter,
                    languageFilter: filters.languageFilter,
                    artistFilter: filters.artistFilter,
                    artists: artists,
                    onApply: ({
                      required keyFilter,
                      required languageFilter,
                      required artistFilter,
                    }) {
                      final notifier =
                          ref.read(libraryFiltersProvider.notifier);
                      notifier.setKey(keyFilter);
                      notifier.setLanguage(languageFilter);
                      notifier.setArtist(artistFilter);
                    },
                  ),
                  icon: const Icon(Icons.filter_list),
                  label: Text(
                    filterButtonLabel,
                    overflow: TextOverflow.ellipsis,
                  ),
                  style: filters.hasActiveFilters
                      ? FilledButton.styleFrom(
                          backgroundColor:
                              Theme.of(context).colorScheme.primaryContainer,
                        )
                      : null,
                ),
              ],
            ),
            if (indexState.error != null) ...[
              const SizedBox(height: 16),
              Card(
                color: Theme.of(context).colorScheme.errorContainer,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        formatError(indexState.error),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onErrorContainer,
                        ),
                      ),
                      TextButton(
                        onPressed: () => ref
                            .read(songIndexControllerProvider.notifier)
                            .retry(),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (showRecent) ...[
              const SizedBox(height: 24),
              RecentSongsSection(
                entries: recent,
                onSongTap: (entry) => _openSong(entry.id),
              ),
            ],
            if (session.user != null && showSocialSections) ...[
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'MY PLAYLISTS',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.2,
                        ),
                  ),
                  TextButton(
                    onPressed: () => context.go(RoutePaths.playlists),
                    child: const Text('See all'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _HomePlaylistsStrip(),
            ],
            if (session.user != null && showSocialSections) ...[
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'GROUP PLAYLISTS',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.2,
                        ),
                  ),
                  TextButton(
                    onPressed: () => context.go(RoutePaths.groups),
                    child: const Text('See all'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const _HomeGroupPlaylistsStrip(),
            ],
            const SizedBox(height: 8),
            Text(
              'ALL SONGS',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                  ),
            ),
            const SizedBox(height: 8),
            if (libraryCapped)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  libraryCapBannerText(libraryResults.length),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            if (indexState.loading && indexState.entries.isEmpty)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Column(
                  children: [
                    for (var i = 0; i < homeLibraryPageSize; i++)
                      const SongRowSkeleton(),
                  ],
                ),
              )
            else if (displayed.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Text(
                  indexState.entries.isEmpty
                      ? 'No songs in the library yet.'
                      : 'No songs match your search.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              )
            else
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Column(
                  children: [
                    for (final entry in displayed)
                      SongRow(
                        entry: entry,
                        onTap: () => _openSong(entry.id),
                      ),
                  ],
                ),
              ),
            if (showLibraryPagination(
              isBrowsingAll: isBrowsingAll,
              libraryResultsLength: libraryResults.length,
            ))
              LibraryPaginationBar(
                page: page,
                pageCount: pageCount,
                onPrevious: () =>
                    ref.read(libraryPageProvider.notifier).previous(),
                onNext: () => ref
                    .read(libraryPageProvider.notifier)
                    .next(pageCount - 1),
              ),
          ],
        ),
      ),
    );
  }
}

class _HomeGroupPlaylistsStrip extends ConsumerWidget {
  const _HomeGroupPlaylistsStrip();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preview = ref.watch(homeGroupPlaylistsPreviewProvider);
    final songPreviews = ref.watch(homeGroupPlaylistSongPreviewsProvider);

    return preview.when(
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const SizedBox.shrink(),
      data: (data) {
        if (data.sessions.isEmpty) {
          return TextButton(
            onPressed: () => context.go(RoutePaths.groups),
            child: const Text('No group playlists yet. Join or create a group'),
          );
        }

        String? groupNameFor(String? groupId) {
          if (groupId == null) {
            return null;
          }
          for (final group in data.groups) {
            if (group.id == groupId) {
              return group.name;
            }
          }
          return null;
        }

        return Column(
          children: [
            for (final session in data.sessions) ...[
              PlaylistCard(session: session, showStatus: true),
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.only(left: 16, bottom: 8),
                child: Text(
                  _groupPlaylistSubtitle(session, groupNameFor(session.groupId)),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
              if (songPreviews.value?[session.id]?.isNotEmpty == true)
                Padding(
                  padding: const EdgeInsets.only(left: 16, bottom: 12),
                  child: Text(
                    songPreviews.value![session.id]!.join(' · '),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
            ],
          ],
        );
      },
    );
  }

  String _groupPlaylistSubtitle(PlaylistSession session, String? groupName) {
    final songLabel =
        session.songCount == 1 ? '1 song' : '${session.songCount} songs';
    if (groupName != null && groupName.isNotEmpty) {
      return '$groupName · $songLabel';
    }
    return songLabel;
  }
}

class _HomePlaylistsStrip extends ConsumerWidget {
  const _HomePlaylistsStrip();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playlists = ref.watch(homeOwnedPlaylistsPreviewProvider);
    final previews = ref.watch(homePlaylistPreviewsProvider);

    return playlists.when(
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const SizedBox.shrink(),
      data: (sessions) {
        if (sessions.isEmpty) {
          return TextButton(
            onPressed: () => context.push(RoutePaths.playlistsNew),
            child: const Text('Create your first playlist'),
          );
        }
        return Column(
          children: [
            for (final session in sessions) ...[
              PlaylistCard(session: session, showStatus: true),
              const SizedBox(height: 8),
              if (previews.value?[session.id]?.isNotEmpty == true)
                Padding(
                  padding: const EdgeInsets.only(left: 16, bottom: 12),
                  child: Text(
                    previews.value![session.id]!.join(' · '),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
            ],
          ],
        );
      },
    );
  }
}
