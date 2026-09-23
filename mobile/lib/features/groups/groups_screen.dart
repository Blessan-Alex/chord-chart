import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/data/models/user_profile.dart';
import 'package:lf_chords/features/groups/widgets/group_sheets.dart';
import 'package:lf_chords/features/groups/widgets/member_pills.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/group_providers.dart';

class GroupsScreen extends ConsumerStatefulWidget {
  const GroupsScreen({super.key});

  @override
  ConsumerState<GroupsScreen> createState() => _GroupsScreenState();
}

class _GroupsScreenState extends ConsumerState<GroupsScreen> {
  bool _busy = false;

  Future<void> _create(String name) async {
    final user = ref.read(authControllerProvider).session.user;
    if (user == null) {
      return;
    }
    setState(() => _busy = true);
    try {
      UserProfile? profile = ref.read(authControllerProvider).session.profile;
      profile ??= await ref.read(userRepositoryProvider).getUserProfile(user.uid);
      await ref.read(groupsRepositoryProvider).createGroup(
            name: name,
            ownerId: user.uid,
            ownerProfile: profile,
          );
      invalidateUserGroupCaches(ref);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _join(String code) async {
    final user = ref.read(authControllerProvider).session.user;
    if (user == null) {
      return;
    }
    setState(() => _busy = true);
    try {
      UserProfile? profile = ref.read(authControllerProvider).session.profile;
      profile ??= await ref.read(userRepositoryProvider).getUserProfile(user.uid);
      await ref.read(groupsRepositoryProvider).joinGroupByInviteCode(
            inviteCodeRaw: code,
            uid: user.uid,
            profile: profile,
          );
      invalidateUserGroupCaches(ref);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  void _openCreate() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => CreateGroupSheet(busy: _busy, onCreate: _create),
    );
  }

  void _openJoin() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => JoinGroupSheet(busy: _busy, onJoin: _join),
    );
  }

  @override
  Widget build(BuildContext context) {
    final groupsAsync = ref.watch(groupsForUserProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Groups')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(groupsForUserProvider);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Band teams and shared playlists',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                TextButton(onPressed: _openJoin, child: const Text('Join')),
                const Spacer(),
                FilledButton(
                  onPressed: _openCreate,
                  child: const Icon(Icons.add),
                ),
              ],
            ),
            const SizedBox(height: 16),
            groupsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Could not load groups. $e'),
              data: (groups) {
                if (groups.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Column(
                      children: [
                        Text(
                          'No groups yet',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Create a group or join with an invite code.',
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  );
                }
                return Column(
                  children: [
                    for (final group in groups) ...[
                      ListTile(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(
                            color: Theme.of(context).colorScheme.outlineVariant,
                          ),
                        ),
                        title: Text(group.name),
                        subtitle: Text(
                          '${group.memberIds.length} '
                          '${group.memberIds.length == 1 ? 'member' : 'members'} · '
                          '${group.playlistCount} '
                          '${group.playlistCount == 1 ? 'playlist' : 'playlists'}',
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => context.push(RoutePaths.groupDetail(group.id)),
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.only(left: 8, bottom: 8),
                        child: MemberPills(members: group.members),
                      ),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
