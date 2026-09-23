import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/core/network/join_api_client.dart';
import 'package:lf_chords/data/repositories/playlist_invites_repository.dart';
import 'package:lf_chords/data/repositories/session_repository.dart';
import 'package:lf_chords/data/repositories/session_songs_repository.dart';
import 'package:lf_chords/domain/session_navigation.dart';
import 'package:lf_chords/providers/auth_providers.dart';

final sessionRepositoryProvider = Provider<SessionRepository>((ref) {
  return SessionRepository(ref.watch(firestoreProvider));
});

final sessionSongsRepositoryProvider = Provider<SessionSongsRepository>((ref) {
  return SessionSongsRepository(ref.watch(firestoreProvider));
});

final playlistInvitesRepositoryProvider =
    Provider<PlaylistInvitesRepository>((ref) {
  return PlaylistInvitesRepository(ref.watch(firestoreProvider));
});

final joinApiClientProvider = Provider<JoinApiClient>((ref) {
  return JoinApiClient();
});

final playlistsForUserProvider =
    FutureProvider.autoDispose<List<PlaylistSession>>((ref) async {
  final uid = ref.watch(authControllerProvider).session.user?.uid;
  if (uid == null) {
    return [];
  }
  return ref.watch(sessionRepositoryProvider).listPlaylistsForUser(uid);
});

final ownedPlaylistsProvider =
    FutureProvider.autoDispose<List<PlaylistSession>>((ref) async {
  final uid = ref.watch(authControllerProvider).session.user?.uid;
  if (uid == null) {
    return [];
  }
  return ref.watch(sessionRepositoryProvider).listOwnedPlaylists(uid);
});

final playlistSessionProvider = FutureProvider.autoDispose
    .family<PlaylistSession?, String>((ref, sessionId) {
  return ref.watch(sessionRepositoryProvider).getSession(sessionId);
});

final sessionSongsStreamProvider = StreamProvider.autoDispose
    .family<List<SessionSongEntry>, String>((ref, sessionId) {
  if (sessionId.isEmpty) {
    return const Stream.empty();
  }
  return ref.watch(sessionSongsRepositoryProvider).watchSessionSongs(sessionId);
});

/// Up to 2 owned playlists with 3 preview song titles each (home P1).
final homePlaylistPreviewsProvider =
    FutureProvider.autoDispose<Map<String, List<String>>>((ref) async {
  final sessions = await ref.watch(homeOwnedPlaylistsPreviewProvider.future);
  final songsRepo = ref.watch(sessionSongsRepositoryProvider);
  final out = <String, List<String>>{};
  for (final session in sessions) {
    try {
      final songs = await songsRepo.listSessionSongs(session.id);
      out[session.id] = songs.take(3).map((s) => s.songTitle).toList();
    } catch (_) {
      out[session.id] = const [];
    }
  }
  return out;
});

final homeOwnedPlaylistsPreviewProvider =
    FutureProvider.autoDispose<List<PlaylistSession>>((ref) async {
  final owned = await ref.watch(ownedPlaylistsProvider.future);
  return owned.take(2).toList();
});

/// Refresh merged list, owned list, and home preview caches.
void invalidateUserPlaylistCaches(WidgetRef ref) {
  ref.invalidate(playlistsForUserProvider);
  ref.invalidate(ownedPlaylistsProvider);
  ref.invalidate(homeOwnedPlaylistsPreviewProvider);
  ref.invalidate(homePlaylistPreviewsProvider);
}
