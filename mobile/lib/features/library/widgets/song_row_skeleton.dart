import 'package:flutter/material.dart';

class SongRowSkeleton extends StatelessWidget {
  const SongRowSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHigh,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 16,
                  width: double.infinity,
                  color: theme.colorScheme.surfaceContainerHigh,
                ),
                const SizedBox(height: 8),
                Container(
                  height: 12,
                  width: 120,
                  color: theme.colorScheme.surfaceContainerHigh,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
