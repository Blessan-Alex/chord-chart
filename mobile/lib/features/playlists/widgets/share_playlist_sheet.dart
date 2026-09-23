import 'package:flutter/material.dart';
import 'package:lf_chords/domain/share_playlist.dart';

class SharePlaylistSheet extends StatelessWidget {
  const SharePlaylistSheet({
    super.key,
    required this.title,
    required this.inviteToken,
    required this.onRegenerate,
    required this.onShareLink,
    this.busy = false,
  });

  final String title;
  final String inviteToken;
  final Future<void> Function() onRegenerate;
  final Future<void> Function() onShareLink;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final url = playlistInviteUrl(inviteToken);

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
          const Text(
            'Anyone with this link can join after signing in.',
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: busy ? null : () => onShareLink(),
            child: const Text('Share link'),
          ),
          TextButton(
            onPressed: busy ? null : () => onRegenerate(),
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
