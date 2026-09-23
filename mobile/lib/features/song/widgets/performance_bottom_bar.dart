import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/domain/performance_preferences.dart';

class PerformanceBottomBar extends StatelessWidget {
  const PerformanceBottomBar({
    super.key,
    required this.displayKey,
    required this.transposeFlash,
    required this.onOpenKeyModal,
    required this.onZoomOut,
    required this.onZoomIn,
    required this.chartTheme,
    required this.onToggleTheme,
    required this.onToggleAutoscroll,
    required this.autoscrollActive,
    required this.onToggleFullscreen,
    required this.fullscreenActive,
    this.sessionLabel,
    this.sessionPosition,
    this.prevPath,
    this.nextPath,
    this.onNavigatePrev,
    this.onNavigateNext,
    this.sessionBackPath,
  });

  final String displayKey;
  final String? transposeFlash;
  final VoidCallback onOpenKeyModal;
  final VoidCallback onZoomOut;
  final VoidCallback onZoomIn;
  final ChartTheme chartTheme;
  final VoidCallback onToggleTheme;
  final VoidCallback onToggleAutoscroll;
  final bool autoscrollActive;
  final VoidCallback onToggleFullscreen;
  final bool fullscreenActive;
  final String? sessionLabel;
  final String? sessionPosition;
  final String? prevPath;
  final String? nextPath;
  final VoidCallback? onNavigatePrev;
  final VoidCallback? onNavigateNext;
  final String? sessionBackPath;

  @override
  Widget build(BuildContext context) {
    final keyLabel = transposeFlash ?? displayKey;
    final showNav = prevPath != null || nextPath != null;

    return Material(
      elevation: 8,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (sessionLabel != null && sessionLabel!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Row(
                    children: [
                      Flexible(
                        child: sessionBackPath != null
                            ? TextButton(
                                onPressed: () => context.go(sessionBackPath!),
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  sessionLabel!,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.labelSmall,
                                ),
                              )
                            : Text(
                                sessionLabel!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.labelSmall,
                              ),
                      ),
                      if (sessionPosition != null)
                        Text(
                          ' · $sessionPosition',
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: Theme.of(context).colorScheme.outline,
                              ),
                        ),
                    ],
                  ),
                ),
              Row(
                children: [
                  if (showNav) ...[
                    _NavIcon(
                      enabled: prevPath != null,
                      label: 'Previous song',
                      icon: Icons.arrow_back_ios_new,
                      onTap: onNavigatePrev,
                    ),
                    _NavIcon(
                      enabled: nextPath != null,
                      label: 'Next song',
                      icon: Icons.arrow_forward_ios,
                      onTap: onNavigateNext,
                    ),
                  ],
                  Expanded(
                    child: Center(
                      child: Semantics(
                        label: 'Key $keyLabel. Tap to choose key.',
                        button: true,
                        child: FilledButton.tonal(
                          onPressed: onOpenKeyModal,
                          child: Text(
                            keyLabel,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: onZoomOut,
                    icon: const Icon(Icons.zoom_out),
                    tooltip: 'Zoom out',
                  ),
                  IconButton(
                    onPressed: onZoomIn,
                    icon: const Icon(Icons.zoom_in),
                    tooltip: 'Zoom in',
                  ),
                  Semantics(
                    label: 'Theme: ${chartThemeLabel(chartTheme)}',
                    button: true,
                    child: IconButton(
                      onPressed: onToggleTheme,
                      icon: const Icon(Icons.brightness_4_outlined),
                    ),
                  ),
                  IconButton(
                    onPressed: onToggleAutoscroll,
                    icon: Icon(
                      autoscrollActive
                          ? Icons.pause_circle_filled
                          : Icons.play_circle_outline,
                    ),
                    tooltip: 'Autoscroll',
                  ),
                  IconButton(
                    onPressed: onToggleFullscreen,
                    icon: Icon(
                      fullscreenActive
                          ? Icons.fullscreen_exit
                          : Icons.fullscreen,
                    ),
                    tooltip: 'Fullscreen',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavIcon extends StatelessWidget {
  const _NavIcon({
    required this.enabled,
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final bool enabled;
  final String label;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      button: enabled,
      enabled: enabled,
      child: IconButton(
        onPressed: enabled ? onTap : null,
        icon: Icon(icon, size: 18),
        color: enabled
            ? Theme.of(context).colorScheme.onSurface
            : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3),
      ),
    );
  }
}
