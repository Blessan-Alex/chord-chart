import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/playlist_labels.dart';
import 'package:lf_chords/domain/session_display.dart';
import 'package:lf_chords/domain/session_navigation.dart';

class PlaylistCard extends StatelessWidget {
  const PlaylistCard({
    super.key,
    required this.session,
    this.showStatus = false,
  });

  final PlaylistSession session;
  final bool showStatus;

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
    final songLabel =
        session.songCount == 1 ? '1 song' : '${session.songCount} songs';

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(RoutePaths.playlistDetail(session.id)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
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
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$songLabel${showStatus ? playlistVisibilitySuffix(session.status) : ''}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
