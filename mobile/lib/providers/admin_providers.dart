import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/data/repositories/admin_stats_repository.dart';
import 'package:lf_chords/data/repositories/song_edits_repository.dart';
import 'package:lf_chords/data/repositories/songs_admin_repository.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/song_index_providers.dart';

final isAdminProvider = Provider<bool>((ref) {
  return ref.watch(authSessionProvider).isAdmin;
});

final adminStatsRepositoryProvider = Provider<AdminStatsRepository>((ref) {
  return AdminStatsRepository(
    ref.watch(firestoreProvider),
    ref.watch(songIndexRepositoryProvider),
  );
});

final songsAdminRepositoryProvider = Provider<SongsAdminRepository>((ref) {
  return SongsAdminRepository(
    ref.watch(firestoreProvider),
    ref.watch(songIndexRepositoryProvider),
  );
});

final songEditsRepositoryProvider = Provider<SongEditsRepository>((ref) {
  return SongEditsRepository(
    ref.watch(firestoreProvider),
    ref.watch(songsAdminRepositoryProvider),
    ref.watch(songIndexRepositoryProvider),
  );
});
