import 'package:flutter/material.dart';
import 'package:lf_chords/domain/share_playlist.dart';

class SharePlaylistSheet extends StatefulWidget {
  const SharePlaylistSheet({
    super.key,
    required this.title,
    required this.inviteToken,
    required this.onRegenerate,
    required this.onShareLink,
    this.busy = false,
    this.showUsernameShare = false,
    this.onShareUsername,
  });

  final String title;
  final String inviteToken;
  final Future<void> Function() onRegenerate;
  final Future<void> Function() onShareLink;
  final bool busy;
  final bool showUsernameShare;
  final Future<void> Function(String username)? onShareUsername;

  @override
  State<SharePlaylistSheet> createState() => _SharePlaylistSheetState();
}

class _SharePlaylistSheetState extends State<SharePlaylistSheet> {
  final _usernameController = TextEditingController();

  @override
  void dispose() {
    _usernameController.dispose();
    super.dispose();
  }

  Future<void> _submitUsername() async {
    final handler = widget.onShareUsername;
    if (handler == null || widget.busy) {
      return;
    }
    final username = _usernameController.text.trim();
    if (username.isEmpty) {
      return;
    }
    await handler(username);
    if (mounted) {
      _usernameController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final url = playlistInviteUrl(widget.inviteToken);

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.paddingOf(context).bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Share playlist', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          if (widget.showUsernameShare) ...[
            const Text(
              'Add someone by their @username (they must already have an account).',
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _usernameController,
                    decoration: const InputDecoration(
                      labelText: 'Username',
                      prefixText: '@',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submitUsername(),
                    enabled: !widget.busy,
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: widget.busy ? null : _submitUsername,
                  child: const Text('Add'),
                ),
              ],
            ),
            const Divider(height: 32),
          ],
          const Text(
            'Anyone with this link can join after signing in.',
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: widget.busy ? null : () => widget.onShareLink(),
            child: const Text('Share link'),
          ),
          TextButton(
            onPressed: widget.busy ? null : () => widget.onRegenerate(),
            child: const Text('Reset invite link'),
          ),
          const SizedBox(height: 8),
          SelectableText(
            url,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontFamily: 'monospace',
                ),
          ),
        ],
      ),
    );
  }
}
