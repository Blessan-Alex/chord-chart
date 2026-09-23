import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/group.dart';
import 'package:lf_chords/features/groups/widgets/member_pills.dart';
import 'package:lf_chords/features/playlists/widgets/playlist_card.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/group_providers.dart';
import 'package:lf_chords/providers/playlist_providers.dart';

class GroupDetailScreen extends ConsumerStatefulWidget {
  const GroupDetailScreen({super.key, required this.groupId});

  final String groupId;

  @override
  ConsumerState<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends ConsumerState<GroupDetailScreen> {
  bool _busy = false;
  String? _message;
  String? _error;
  final _inviteUsernameController = TextEditingController();

  @override
  void dispose() {
    _inviteUsernameController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(groupProvider(widget.groupId));
  }

  Future<void> _copyCode(String code) async {
    await Clipboard.setData(ClipboardData(text: code));
    setState(() => _message = 'Invite code copied');
  }

  Future<void> _invite(Group group, String uid) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final normalized = _inviteUsernameController.text.trim().toLowerCase();
      await ref.read(groupsRepositoryProvider).inviteGroupMemberByUsername(
            group: group,
            usernameRaw: _inviteUsernameController.text,
            inviterUid: uid,
          );
      ref.invalidate(groupProvider(widget.groupId));
      invalidateUserGroupCaches(ref);
      _inviteUsernameController.clear();
      setState(() => _message = 'Invited @$normalized');
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _createPlaylist(Group group, String uid) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final profile = ref.read(authControllerProvider).session.profile;
      await ref.read(sessionRepositoryProvider).createSession(
            title: '${group.name} set list',
            date: DateTime.now(),
            createdBy: uid,
            ownerUsername: profile?.username,
            groupId: group.id,
          );
      try {
        await ref
            .read(groupsRepositoryProvider)
            .incrementGroupPlaylistCount(group.id);
      } catch (_) {
        // Non-owners cannot update groups/{id}; playlist still created (web parity).
      }
      invalidateUserGroupCaches(ref);
      await _refresh();
      setState(() => _message = 'Playlist created');
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _deleteGroup(Group group, String uid) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(groupsRepositoryProvider).deleteGroup(
            group: group,
            actorUid: uid,
          );
      invalidateUserGroupCaches(ref);
      invalidateUserPlaylistCaches(ref);
      if (mounted) {
        context.go(RoutePaths.groups);
      }
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final uid = ref.watch(authControllerProvider).session.user?.uid ?? '';
    final groupAsync = ref.watch(groupProvider(widget.groupId));

    return groupAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('Could not load group. $e')),
      ),
      data: (group) {
        if (group == null) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(child: Text('Group not found.')),
          );
        }

        if (!isGroupMember(group, uid)) {
          return Scaffold(
            appBar: AppBar(title: Text(group.name)),
            body: const Center(
              child: Text('You do not have access to this group.'),
            ),
          );
        }

        final isOwner = isGroupOwner(group, uid);

        return Scaffold(
          appBar: AppBar(
            title: Text(group.name),
            actions: [
              if (isOwner)
                IconButton(
                  onPressed: _busy
                      ? null
                      : () async {
                          final ok = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Delete group?'),
                              content: Text(
                                '"${group.name}" and all ${group.playlistCount} '
                                'group playlist${group.playlistCount == 1 ? '' : 's'} '
                                'will be removed permanently. Members will lose access.',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context, false),
                                  child: const Text('Cancel'),
                                ),
                                FilledButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  child: const Text('Delete group'),
                                ),
                              ],
                            ),
                          );
                          if (ok == true) {
                            await _deleteGroup(group, uid);
                          }
                        },
                  icon: const Icon(Icons.delete_outline),
                ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextButton(
                  onPressed: () => context.pop(),
                  child: const Align(
                    alignment: Alignment.centerLeft,
                    child: Text('← Groups'),
                  ),
                ),
                Text(
                  '${group.memberIds.length} '
                  '${group.memberIds.length == 1 ? 'member' : 'members'} · '
                  '${group.playlistCount} '
                  '${group.playlistCount == 1 ? 'playlist' : 'playlists'}',
                ),
                if (_message != null)
                  Text(_message!, style: TextStyle(color: Theme.of(context).colorScheme.primary)),
                if (_error != null)
                  Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                const SizedBox(height: 16),
                const Text('MEMBERS', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                MemberPills(members: group.members),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('INVITE CODE',
                              style: TextStyle(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 8),
                          Text(
                            group.inviteCode,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 18,
                              letterSpacing: 4,
                            ),
                          ),
                        ],
                      ),
                    ),
                    OutlinedButton(
                      onPressed: () => _copyCode(group.inviteCode),
                      child: const Text('Copy code'),
                    ),
                  ],
                ),
                if (isOwner) ...[
                  const SizedBox(height: 24),
                  const Text('INVITE BY USERNAME',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _inviteUsernameController,
                          decoration: const InputDecoration(
                            hintText: '@username',
                            border: OutlineInputBorder(),
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: _busy || _inviteUsernameController.text.trim().isEmpty
                            ? null
                            : () => _invite(group, uid),
                        child: const Text('Invite'),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('GROUP PLAYLISTS',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                    TextButton(
                      onPressed: _busy ? null : () => _createPlaylist(group, uid),
                      child: const Text('+ New playlist'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                FutureBuilder(
                  future: ref
                      .read(sessionRepositoryProvider)
                      .listPlaylistsForGroup(widget.groupId),
                  builder: (context, snapshot) {
                    final playlists = snapshot.data ?? [];
                    if (playlists.isEmpty) {
                      return const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(child: Text('No group playlists yet.')),
                      );
                    }
                    return Column(
                      children: [
                        for (final session in playlists) ...[
                          PlaylistCard(session: session, showStatus: true),
                          const SizedBox(height: 8),
                        ],
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
