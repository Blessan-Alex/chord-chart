import 'package:flutter/material.dart';

class PlacementToolbar extends StatelessWidget {
  const PlacementToolbar({
    super.key,
    required this.chordCount,
    required this.chordedLines,
    required this.lineCount,
    required this.canUndo,
    required this.onUndo,
    required this.quickChord,
    required this.lastChord,
    required this.onToggleQuickChord,
  });

  final int chordCount;
  final int chordedLines;
  final int lineCount;
  final bool canUndo;
  final VoidCallback onUndo;
  final String? quickChord;
  final String? lastChord;
  final VoidCallback onToggleQuickChord;

  @override
  Widget build(BuildContext context) {
    final armable = quickChord ?? lastChord;
    final theme = Theme.of(context);

    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      runSpacing: 8,
      children: [
        FilledButton.tonal(
          onPressed: canUndo ? onUndo : null,
          child: const Text('Undo'),
        ),
        if (armable != null)
          OutlinedButton(
            onPressed: onToggleQuickChord,
            style: quickChord != null
                ? OutlinedButton.styleFrom(
                    side: BorderSide(color: theme.colorScheme.primary),
                    backgroundColor: theme.colorScheme.primaryContainer
                        .withValues(alpha: 0.35),
                  )
                : null,
            child: Text(
              quickChord != null
                  ? 'Quick place: $armable · on'
                  : 'Quick place: $armable',
            ),
          ),
        Text(
          '$chordCount chords · $chordedLines/$lineCount lines chorded',
          style: theme.textTheme.bodySmall?.copyWith(
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}
