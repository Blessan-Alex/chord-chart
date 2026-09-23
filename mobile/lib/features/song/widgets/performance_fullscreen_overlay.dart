import 'package:flutter/material.dart';

class PerformanceFullscreenOverlay extends StatelessWidget {
  const PerformanceFullscreenOverlay({
    super.key,
    required this.onExit,
    required this.onZoomIn,
    required this.onZoomOut,
    this.nextPath,
    this.onNavigateNext,
    this.sessionPosition,
    this.wakeLockSupported = true,
  });

  final VoidCallback onExit;
  final VoidCallback onZoomIn;
  final VoidCallback onZoomOut;
  final String? nextPath;
  final VoidCallback? onNavigateNext;
  final String? sessionPosition;
  final bool wakeLockSupported;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned(
          top: MediaQuery.paddingOf(context).top + 8,
          right: 12,
          child: Semantics(
            label: 'Exit fullscreen',
            button: true,
            child: Material(
              color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.95),
              shape: const CircleBorder(),
              child: IconButton(
                onPressed: onExit,
                icon: const Icon(Icons.close),
              ),
            ),
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: MediaQuery.paddingOf(context).bottom + 8,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    sessionPosition ??
                        (wakeLockSupported
                            ? ''
                            : 'Screen may dim — adjust Auto-Lock in device settings'),
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
                IconButton(onPressed: onZoomOut, icon: const Icon(Icons.zoom_out)),
                IconButton(onPressed: onZoomIn, icon: const Icon(Icons.zoom_in)),
                Semantics(
                  label: 'Next song',
                  button: nextPath != null,
                  enabled: nextPath != null,
                  child: IconButton(
                    onPressed: onNavigateNext,
                    icon: const Icon(Icons.arrow_forward_ios),
                    color: nextPath != null
                        ? null
                        : Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.3),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
