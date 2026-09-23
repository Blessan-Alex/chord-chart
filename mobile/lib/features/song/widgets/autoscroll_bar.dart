import 'package:flutter/material.dart';
import 'package:lf_chords/domain/autoscroll_speed.dart';

class AutoscrollBar extends StatelessWidget {
  const AutoscrollBar({
    super.key,
    required this.speed,
    required this.paused,
    required this.onDecrease,
    required this.onIncrease,
    required this.onTogglePause,
    required this.onClose,
  });

  final double speed;
  final bool paused;
  final VoidCallback onDecrease;
  final VoidCallback onIncrease;
  final VoidCallback onTogglePause;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 8,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Semantics(
                label: 'Close autoscroll',
                button: true,
                child: IconButton(
                  onPressed: onClose,
                  icon: const Icon(Icons.close),
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Semantics(
                    label: 'Slower',
                    button: true,
                    child: IconButton(
                      onPressed: onDecrease,
                      icon: const Icon(Icons.remove),
                    ),
                  ),
                  Text(
                    '${formatAutoscrollSpeed(speed)}x',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontFeatures: const [FontFeature.tabularFigures()],
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  Semantics(
                    label: 'Faster',
                    button: true,
                    child: IconButton(
                      onPressed: onIncrease,
                      icon: const Icon(Icons.add),
                    ),
                  ),
                ],
              ),
              Semantics(
                label: paused ? 'Resume autoscroll' : 'Pause autoscroll',
                button: true,
                child: FilledButton(
                  onPressed: onTogglePause,
                  child: Text(paused ? '▶' : '❚❚'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
