import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SongHeader extends StatelessWidget {
  const SongHeader({
    super.key,
    required this.title,
    required this.artist,
    required this.backHref,
    this.backLabel = 'Back',
    this.compact = false,
  });

  final String title;
  final String artist;
  final String backHref;
  final String backLabel;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            IconButton(
              onPressed: () => context.go(backHref),
              icon: const Icon(Icons.arrow_back),
              tooltip: backLabel,
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontSize: compact ? 18 : 22,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  if (artist.isNotEmpty)
                    Text(
                      artist,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
