import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/data/models/song.dart';
import 'package:lf_chords/data/repositories/song_repository.dart';
import 'package:lf_chords/domain/performance_preferences.dart';
import 'package:lf_chords/domain/session_navigation.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/song_index_providers.dart';

final songRepositoryProvider = Provider<SongRepository>((ref) {
  return SongRepository(ref.watch(firestoreProvider));
});

final songLiveProvider = StreamProvider.autoDispose
    .family<LiveSongPayload, String>((ref, songId) {
  final auth = ref.watch(authControllerProvider).session;
  if (auth.loading || songId.isEmpty) {
    return Stream.value(
      songId.isEmpty ? const LiveSongPayload(ready: true) : const LiveSongPayload(),
    );
  }
  return ref.watch(songRepositoryProvider).watchSong(songId);
});

class PlaylistContext {
  const PlaylistContext({this.session, this.songs = const []});

  final PlaylistSession? session;
  final List<SessionSongEntry> songs;
}

final playlistContextProvider = FutureProvider.autoDispose
    .family<PlaylistContext, SessionNavParams>((ref, params) async {
  if (params.sessionId == null) {
    return const PlaylistContext();
  }
  final repo = ref.watch(songRepositoryProvider);
  try {
    final session = await repo.getSession(params.sessionId!);
    final songs = await repo.listSessionSongs(params.sessionId!);
    if (params.index != null) {
      final prefs = ref.read(sharedPreferencesProvider);
      await writeLastSessionIndex(prefs, params.sessionId!, params.index!);
    }
    return PlaylistContext(session: session, songs: songs);
  } catch (_) {
    return const PlaylistContext();
  }
});
