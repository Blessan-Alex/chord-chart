import 'package:flutter/material.dart';
import 'package:lf_chords/data/models/song.dart';

class SongControlBar extends StatelessWidget {
  const SongControlBar({
    super.key,
    required this.displayKey,
    required this.originalKey,
    required this.viewMode,
    required this.transposeFlash,
    required this.showMobileControls,
    required this.onTransposeDown,
    required this.onTransposeUp,
    required this.onOpenKeyModal,
    required this.onViewModeChange,
    required this.onZoomOut,
    required this.onZoomIn,
    this.onShare,
    this.onToggleAutoscroll,
    this.autoscrollActive = false,
    this.onToggleFullscreen,
    this.fullscreenActive = false,
  });

  final String displayKey;
  final String originalKey;
  final SongViewMode viewMode;
  final String? transposeFlash;
  final bool showMobileControls;
  final VoidCallback onTransposeDown;
  final VoidCallback onTransposeUp;
  final VoidCallback onOpenKeyModal;
  final ValueChanged<SongViewMode> onViewModeChange;
  final VoidCallback onZoomOut;
  final VoidCallback onZoomIn;
  final VoidCallback? onShare;
  final VoidCallback? onToggleAutoscroll;
  final bool autoscrollActive;
  final VoidCallback? onToggleFullscreen;
  final bool fullscreenActive;

  @override
  Widget build(BuildContext context) {
    if (showMobileControls) {
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          SegmentedButton<SongViewMode>(
            segments: const [
              ButtonSegment(value: SongViewMode.chords, label: Text('Chords')),
              ButtonSegment(value: SongViewMode.numbers, label: Text('Numbers')),
            ],
            selected: {viewMode},
            onSelectionChanged: (s) => onViewModeChange(s.first),
          ),
          if (onShare != null)
            IconButton(
              onPressed: onShare,
              icon: const Icon(Icons.share_outlined),
            ),
        ],
      );
    }

    final keyLabel = transposeFlash ?? displayKey;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            IconButton(
              onPressed: onTransposeDown,
              icon: const Icon(Icons.remove),
              tooltip: 'Transpose down',
            ),
            FilledButton.tonal(
              onPressed: onOpenKeyModal,
              child: Text(keyLabel),
            ),
            IconButton(
              onPressed: onTransposeUp,
              icon: const Icon(Icons.add),
              tooltip: 'Transpose up',
            ),
            SegmentedButton<SongViewMode>(
              segments: const [
                ButtonSegment(value: SongViewMode.chords, label: Text('Chords')),
                ButtonSegment(
                  value: SongViewMode.numbers,
                  label: Text('Numbers'),
                ),
              ],
              selected: {viewMode},
              onSelectionChanged: (s) => onViewModeChange(s.first),
            ),
            IconButton(onPressed: onZoomOut, icon: const Icon(Icons.zoom_out)),
            IconButton(onPressed: onZoomIn, icon: const Icon(Icons.zoom_in)),
            if (onToggleAutoscroll != null)
              IconButton(
                onPressed: onToggleAutoscroll,
                icon: Icon(
                  autoscrollActive
                      ? Icons.pause_circle_filled
                      : Icons.play_circle_outline,
                ),
                tooltip: 'Autoscroll',
              ),
            if (onToggleFullscreen != null)
              IconButton(
                onPressed: onToggleFullscreen,
                icon: Icon(
                  fullscreenActive ? Icons.fullscreen_exit : Icons.fullscreen,
                ),
                tooltip: 'Fullscreen',
              ),
            if (onShare != null)
              IconButton(
                onPressed: onShare,
                icon: const Icon(Icons.share_outlined),
              ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Original key $originalKey',
          style: Theme.of(context).textTheme.labelSmall,
        ),
      ],
    );
  }
}
