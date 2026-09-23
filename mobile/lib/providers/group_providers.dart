import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/data/repositories/groups_repository.dart';
import 'package:lf_chords/domain/group.dart';
import 'package:lf_chords/domain/session_navigation.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/playlist_providers.dart';

final groupsRepositoryProvider = Provider<GroupsRepository>((ref) {
  return GroupsRepository(
    ref.watch(firestoreProvider),
    ref.watch(sessionRepositoryProvider),
  );
});

final groupsForUserProvider =
    FutureProvider.autoDispose<List<Group>>((ref) async {
  final uid = ref.watch(authControllerProvider).session.user?.uid;
  if (uid == null) {
    return [];
  }
  return ref.watch(groupsRepositoryProvider).listGroupsForMember(uid);
});

final userMemberGroupIdsProvider =
    FutureProvider.autoDispose<Set<String>>((ref) async {
  final groups = await ref.watch(groupsForUserProvider.future);
  return groups.map((g) => g.id).toSet();
});

final groupProvider = FutureProvider.autoDispose.family<Group?, String>(
  (ref, groupId) {
    if (groupId.isEmpty) {
      return Future.value(null);
    }
    return ref.watch(groupsRepositoryProvider).getGroup(groupId);
  },
);

/// Home strip: first 2 groups × up to 2 playlists each → flatten → 2 cards.
final homeGroupPlaylistsPreviewProvider =
    FutureProvider.autoDispose<HomeGroupPreviewData>((ref) async {
  final uid = ref.watch(authControllerProvider).session.user?.uid;
  if (uid == null) {
    return const HomeGroupPreviewData(groups: [], sessions: []);
  }

  List<Group> groups = [];
  try {
    groups = await ref.watch(groupsRepositoryProvider).listGroupsForMember(uid);
  } catch (_) {
    groups = [];
  }

  final topGroups = groups.take(2).toList();
  final lists = await Future.wait(
    topGroups.map(
      (group) => ref
          .watch(sessionRepositoryProvider)
          .listPlaylistsForGroup(group.id, limit: 2)
          .catchError((_) => <PlaylistSession>[]),
    ),
  );
  final sessions = lists.expand((l) => l).take(2).toList();

  return HomeGroupPreviewData(groups: topGroups, sessions: sessions);
});

final homeGroupPlaylistSongPreviewsProvider =
    FutureProvider.autoDispose<Map<String, List<String>>>((ref) async {
  final data = await ref.watch(homeGroupPlaylistsPreviewProvider.future);
  final songsRepo = ref.watch(sessionSongsRepositoryProvider);
  final out = <String, List<String>>{};
  for (final session in data.sessions) {
    try {
      final songs = await songsRepo.listSessionSongs(session.id);
      out[session.id] = songs.take(3).map((s) => s.songTitle).toList();
    } catch (_) {
      out[session.id] = const [];
    }
  }
  return out;
});

class HomeGroupPreviewData {
  const HomeGroupPreviewData({
    required this.groups,
    required this.sessions,
  });

  final List<Group> groups;
  final List<PlaylistSession> sessions;
}

void invalidateUserGroupCaches(WidgetRef ref) {
  ref.invalidate(groupsForUserProvider);
  ref.invalidate(homeGroupPlaylistsPreviewProvider);
  ref.invalidate(homeGroupPlaylistSongPreviewsProvider);
  ref.invalidate(userMemberGroupIdsProvider);
}
