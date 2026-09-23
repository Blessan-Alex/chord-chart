import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/connectivity/online_status_provider.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/engine.dart';
import 'package:lf_chords/domain/group.dart';
import 'package:lf_chords/domain/playlist_access.dart';
import 'package:lf_chords/domain/playlist_labels.dart';
import 'package:lf_chords/domain/playlist_members.dart';
import 'package:lf_chords/domain/session_display.dart';
import 'package:lf_chords/domain/session_navigation.dart';
import 'package:lf_chords/domain/share_playlist.dart';
import 'package:lf_chords/domain/song_search_rank.dart';
import 'package:lf_chords/domain/validation.dart';
import 'package:lf_chords/features/playlists/widgets/share_playlist_sheet.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/group_providers.dart';
import 'package:lf_chords/providers/playlist_providers.dart';
import 'package:lf_chords/providers/song_index_providers.dart';
import 'package:share_plus/share_plus.dart';

class PlaylistDetailScreen extends ConsumerStatefulWidget {
  const PlaylistDetailScreen({super.key, required this.sessionId});

  final String sessionId;

  @override
  ConsumerState<PlaylistDetailScreen> createState() =>
      _PlaylistDetailScreenState();
}

class _PlaylistDetailScreenState extends ConsumerState<PlaylistDetailScreen> {
  bool _editMode = false;
  bool _showAddPanel = false;
  String _addSearch = '';
  bool _busy = false;
  String? _message;
  String? _error;
  String? _inviteToken;
  bool _ensureTokenInFlight = false;

  void _refreshPlaylistCaches() {
    invalidateUserPlaylistCaches(ref);
  }

  Future<void> _run(Future<void> Function() action, {String? success}) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (success != null) {
        setState(() => _message = success);
      }
      ref.invalidate(playlistSessionProvider(widget.sessionId));
      _refreshPlaylistCaches();
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _ensureToken(PlaylistSession session, String uid) async {
    if (!isPlaylistOwner(session, uid) ||
        _inviteToken != null ||
        _ensureTokenInFlight) {
      return;
    }
    _ensureTokenInFlight = true;
    try {
      final token = await ref
          .read(playlistInvitesRepositoryProvider)
          .ensurePlaylistInviteToken(session, uid);
      ref.invalidate(playlistSessionProvider(widget.sessionId));
      if (mounted) {
        setState(() => _inviteToken = token);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      _ensureTokenInFlight = false;
    }
  }

  Future<void> _regenerateInviteToken(PlaylistSession session, String uid) async {
    final tokenForDelete = _inviteToken ?? session.shareToken;
    final sessionForRegen = tokenForDelete != null
        ? session.withShareToken(tokenForDelete)
        : session;
    final token = await ref
        .read(playlistInvitesRepositoryProvider)
        .regeneratePlaylistInviteToken(sessionForRegen, uid);
    ref.invalidate(playlistSessionProvider(widget.sessionId));
    if (mounted) {
      setState(() => _inviteToken = token);
    }
  }

  Future<void> _quickShare(String title) async {
    final token = _inviteToken;
    if (token == null) {
      return;
    }
    final url = playlistInviteUrl(token);
    await SharePlus.instance.share(
      ShareParams(text: playlistShareMessage(title, url)),
    );
  }

  Future<void> _shareByUsername(
    PlaylistSession session,
    String uid,
    String usernameRaw,
  ) async {
    final validated = validateUsername(usernameRaw);
    final normalized = validated is UsernameValid
        ? validated.normalized
        : usernameRaw.trim().toLowerCase();
    await _run(
      () => ref.read(sessionRepositoryProvider).sharePlaylistByUsername(
            session: session,
            usernameRaw: usernameRaw,
            inviterUid: uid,
          ),
      success: 'Added @$normalized',
    );
  }

  Future<void> _pickKey(SessionSongEntry entry, String originalKey) async {
    final picked = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Song key'),
        children: allKeys
            .map(
              (key) => SimpleDialogOption(
                onPressed: () => Navigator.pop(context, key),
                child: Text(key),
              ),
            )
            .toList(),
      ),
    );
    if (picked == null) {
      return;
    }
    await _run(
      () => ref.read(sessionSongsRepositoryProvider).updateSessionSongKeyOverride(
            widget.sessionId,
            entry.id,
            picked == originalKey ? null : picked,
          ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final uid = ref.watch(authControllerProvider).session.user?.uid ?? '';
    final online = ref.watch(onlineStatusProvider);
    final memberGroupIdsAsync = ref.watch(userMemberGroupIdsProvider);
    final memberGroupIds = memberGroupIdsAsync.value ?? const {};
    final sessionAsync = ref.watch(playlistSessionProvider(widget.sessionId));
    final session = sessionAsync.asData?.value;
    final groupForSession = session?.groupId;
    final groupAsync = groupForSession != null && groupForSession.isNotEmpty
        ? ref.watch(groupProvider(groupForSession))
        : null;
    final group = groupAsync?.asData?.value;
    final songsAsync = ref.watch(sessionSongsStreamProvider(widget.sessionId));
    final indexEntries = ref.watch(songIndexEntriesProvider);

    ref.listen(playlistSessionProvider(widget.sessionId), (previous, next) {
      next.whenData((session) {
        if (session == null || uid.isEmpty) {
          return;
        }
        if (_inviteToken == null && session.shareToken != null) {
          setState(() => _inviteToken = session.shareToken);
        }
        if (isPlaylistOwner(session, uid) &&
            _inviteToken == null &&
            !_ensureTokenInFlight) {
          unawaited(_ensureToken(session, uid));
        }
      });
    });

    return sessionAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('Could not load playlist. $e')),
      ),
      data: (session) {
        if (session == null) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(child: Text('Playlist not found.')),
          );
        }

        final isMemberViaGroupDoc = group != null &&
            session.groupId == group.id &&
            isGroupMember(group, uid);
        final canView = canViewPlaylist(
              session,
              uid,
              memberGroupIds: memberGroupIds,
            ) ||
            isMemberViaGroupDoc;
        final isOwner = isPlaylistOwner(session, uid);
        final canEdit = isOwner;
        final canDelete = canDeletePlaylist(session, uid, group: group);

        final membershipStillLoading = session.groupId != null &&
            uid.isNotEmpty &&
            !canView &&
            !isOwner &&
            (memberGroupIdsAsync.isLoading || (groupAsync?.isLoading ?? false));

        if (membershipStillLoading) {
          return Scaffold(
            appBar: AppBar(title: Text(session.title)),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        if (!canView) {
          return Scaffold(
            appBar: AppBar(title: Text(session.title)),
            body: const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'This private playlist is only visible to the owner and invited members.',
              ),
            ),
          );
        }

        final showRowEdit = isOwner && _editMode;
        final songs = songsAsync.value ?? [];
        final playPath = startSetPath(widget.sessionId, songs);
        final addResults = rankSongIndexResults(indexEntries, _addSearch)
            .take(8)
            .toList();
        final members = buildPlaylistMemberList(session);

        return Scaffold(
          appBar: AppBar(
            title: Text(session.title, maxLines: 1, overflow: TextOverflow.ellipsis),
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextButton(
                onPressed: () => context.go(RoutePaths.playlists),
                child: const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('← Playlists'),
                ),
              ),
              if (_error != null)
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              if (_message != null)
                Text(_message!, style: TextStyle(color: Theme.of(context).colorScheme.primary)),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  _HeroTile(session: session),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          playlistVisibilityLabel(session.status).toUpperCase(),
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                        Text(
                          session.title,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        Text(
                          '${formatSessionDateLong(session.date)} · ${songs.length} '
                          '${songs.length == 1 ? 'song' : 'songs'}'
                          '${session.ownerUsername?.isNotEmpty == true && !isOwner ? ' · @${session.ownerUsername}' : ''}',
                        ),
                        Text(
                          playlistAccessLabel(playlistAccessCount(session)),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (members.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: members.take(8).map((m) {
                    final label = m.username?.isNotEmpty == true
                        ? '@${m.username}'
                        : m.displayName;
                    return Chip(label: Text(label));
                  }).toList(),
                ),
              ],
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  IconButton.filled(
                    onPressed: playPath == null ? null : () => context.push(playPath),
                    icon: const Icon(Icons.play_arrow),
                    tooltip: 'Start set',
                  ),
                  IconButton(
                    onPressed: _busy || !online
                        ? null
                        : () => _run(
                              () => ref
                                  .read(sessionRepositoryProvider)
                                  .cacheSessionOffline(
                                    widget.sessionId,
                                    ref.read(sessionSongsRepositoryProvider),
                                  ),
                              success: 'Playlist cached for offline use.',
                            ),
                    icon: const Icon(Icons.download),
                    tooltip: online
                        ? 'Cache for offline'
                        : 'Connect to download this set.',
                  ),
                  if (isOwner) ...[
                    IconButton(
                      onPressed: _busy || _inviteToken == null
                          ? null
                          : () => _quickShare(session.title),
                      icon: const Icon(Icons.share),
                      tooltip: 'Share playlist',
                    ),
                    IconButton(
                      onPressed: _busy || _inviteToken == null
                          ? null
                          : () {
                              final token = _inviteToken!;
                              showModalBottomSheet<void>(
                                context: context,
                                isScrollControlled: true,
                                builder: (context) => SharePlaylistSheet(
                                  title: session.title,
                                  inviteToken: token,
                                  busy: _busy,
                                  showUsernameShare: true,
                                  onShareUsername: (username) async {
                                    await _shareByUsername(session, uid, username);
                                  },
                                  onShareLink: () async {
                                    await _quickShare(session.title);
                                  },
                                  onRegenerate: () async {
                                    await _run(
                                      () => _regenerateInviteToken(session, uid),
                                      success:
                                          'Invite link reset. Old links no longer work.',
                                    );
                                    if (context.mounted) {
                                      Navigator.pop(context);
                                    }
                                  },
                                ),
                              );
                            },
                      icon: const Icon(Icons.link),
                      tooltip: 'Invite link',
                    ),
                  ],
                  if (canDelete)
                    IconButton(
                      onPressed: _busy
                          ? null
                          : () => _confirmDelete(session, uid, group),
                      icon: const Icon(Icons.delete_outline),
                      color: Theme.of(context).colorScheme.error,
                    ),
                  if (isOwner)
                    OutlinedButton(
                      onPressed: () => setState(() {
                        _editMode = !_editMode;
                        _showAddPanel = false;
                      }),
                      child: Text(_editMode ? 'Done' : 'Edit'),
                    ),
                  if (canEdit && session.status == 'draft')
                    OutlinedButton(
                      onPressed: _busy ? null : () => _confirmPublish(),
                      child: const Text('Make public'),
                    ),
                  if (canEdit)
                    OutlinedButton(
                      onPressed: () => setState(() => _showAddPanel = !_showAddPanel),
                      child: Text(_showAddPanel ? 'Done' : '+ Add songs'),
                    ),
                ],
              ),
              if (canEdit && _showAddPanel) ...[
                const SizedBox(height: 16),
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search library…',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (v) => setState(() => _addSearch = v),
                ),
                if (_addSearch.trim().isNotEmpty)
                  ...addResults.map(
                    (entry) => ListTile(
                      title: Text(entry.title),
                      trailing: const Text('+ Add'),
                      onTap: _busy
                          ? null
                          : () => _run(
                                () => ref
                                    .read(sessionSongsRepositoryProvider)
                                    .addSongToSession(
                                      sessionId: widget.sessionId,
                                      songId: entry.id,
                                      songTitle: entry.title,
                                      addedBy: uid,
                                    ),
                                success: '"${entry.title}" added.',
                              ),
                    ),
                  ),
              ],
              const SizedBox(height: 24),
              if (songsAsync.hasError && songs.isEmpty)
                Text(
                  'Could not load playlist songs. '
                  '${songsAsync.error}',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                  ),
                )
              else if (songsAsync.isLoading && songs.isEmpty)
                const Center(child: CircularProgressIndicator())
              else if (songs.isEmpty)
                const Text('No songs yet. Add songs to build this set list.')
              else
                ...List.generate(songs.length, (index) {
                  final entry = songs[index];
                  final keyMap = {
                    for (final e in indexEntries) e.id: e.key,
                  };
                  final originalKey = keyMap[entry.songId] ?? 'C';
                  final displayKey = entry.keyOverride ?? originalKey;
                  return Card(
                    child: ListTile(
                      leading: CircleAvatar(child: Text('${index + 1}')),
                      title: Text(entry.songTitle),
                      subtitle: showRowEdit ? null : Text('Key $displayKey'),
                      onTap: () => context.push(
                        sessionSongPath(widget.sessionId, entry, index),
                      ),
                      trailing: showRowEdit
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                TextButton(
                                  onPressed: () =>
                                      _pickKey(entry, originalKey),
                                  child: Text(displayKey),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.arrow_upward),
                                  onPressed: index == 0 || _busy
                                      ? null
                                      : () => _run(
                                            () => ref
                                                .read(sessionSongsRepositoryProvider)
                                                .moveSessionSongUp(
                                                  widget.sessionId,
                                                  songs,
                                                  index,
                                                ),
                                          ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.arrow_downward),
                                  onPressed: index >= songs.length - 1 || _busy
                                      ? null
                                      : () => _run(
                                            () => ref
                                                .read(sessionSongsRepositoryProvider)
                                                .moveSessionSongDown(
                                                  widget.sessionId,
                                                  songs,
                                                  index,
                                                ),
                                          ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.close),
                                  onPressed: _busy
                                      ? null
                                      : () => _confirmRemove(entry),
                                ),
                              ],
                            )
                          : Chip(label: Text(displayKey)),
                    ),
                  );
                }),
            ],
          ),
        );
      },
    );
  }

  Future<void> _confirmPublish() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Make playlist public?'),
        content: const Text(publishConfirmMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Make public'),
          ),
        ],
      ),
    );
    if (ok != true) {
      return;
    }
    await _run(
      () => ref
          .read(sessionRepositoryProvider)
          .updateSessionStatus(widget.sessionId, 'published'),
      success: 'Playlist is now public.',
    );
  }

  Future<void> _confirmDelete(
    PlaylistSession session,
    String uid,
    Group? group,
  ) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete playlist?'),
        content: Text(
          '"${session.title}" and its songs will be removed permanently. '
          'Shared members will lose access.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete playlist'),
          ),
        ],
      ),
    );
    if (ok != true) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(sessionRepositoryProvider).deleteSession(
            session,
            uid,
            asGroupOwner: group != null && isGroupOwner(group, uid),
          );
      _refreshPlaylistCaches();
      invalidateUserGroupCaches(ref);
      ref.invalidate(playlistSessionProvider(widget.sessionId));
      if (mounted) {
        context.go(RoutePaths.playlists);
      }
    } catch (error) {
      setState(() {
        _error = error.toString();
        _busy = false;
      });
    }
  }

  Future<void> _confirmRemove(SessionSongEntry entry) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove from playlist?'),
        content: Text(
          '"${entry.songTitle}" will be removed from this playlist.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (ok != true) {
      return;
    }
    await _run(
      () => ref.read(sessionSongsRepositoryProvider).removeSongFromSession(
            widget.sessionId,
            entry.id,
          ),
    );
  }
}

class _HeroTile extends StatelessWidget {
  const _HeroTile({required this.session});

  final PlaylistSession session;

  static const _gradients = [
    [Color(0xFF059669), Color(0xFF115E59)],
    [Color(0xFF7C3AED), Color(0xFF3730A3)],
    [Color(0xFFE11D48), Color(0xFF9A3412)],
    [Color(0xFF0284C7), Color(0xFF1E3A8A)],
    [Color(0xFFD97706), Color(0xFF854D0E)],
    [Color(0xFFC026D3), Color(0xFF581C87)],
  ];

  @override
  Widget build(BuildContext context) {
    final gradient = _gradients[sessionTileGradientIndex(session.id)];
    return Container(
      width: 96,
      height: 96,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: LinearGradient(
          colors: gradient,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Text(
        sessionInitials(session.title),
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 20,
        ),
      ),
    );
  }
}
