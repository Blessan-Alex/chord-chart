import 'package:flutter/material.dart';
import 'package:lf_chords/domain/performance_preferences.dart';

class ChordChartViewport extends StatefulWidget {
  const ChordChartViewport({
    super.key,
    required this.scale,
    required this.scalePercent,
    required this.showIndicator,
    required this.onPinchUpdate,
    required this.onPinchEnd,
    required this.onDoubleTap,
    required this.child,
  });

  final double scale;
  final int scalePercent;
  final bool showIndicator;
  final ValueChanged<double> onPinchUpdate;
  final VoidCallback onPinchEnd;
  final VoidCallback onDoubleTap;
  final Widget child;

  @override
  State<ChordChartViewport> createState() => _ChordChartViewportState();
}

class _ChordChartViewportState extends State<ChordChartViewport> {
  double? _pinchStartScale;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onScaleStart: (_) => _pinchStartScale = widget.scale,
      onScaleUpdate: (details) {
        final start = _pinchStartScale ?? widget.scale;
        widget.onPinchUpdate(clampChartScale(start * details.scale));
      },
      onScaleEnd: (_) {
        _pinchStartScale = null;
        widget.onPinchEnd();
      },
      onDoubleTap: widget.onDoubleTap,
      child: Stack(
        alignment: Alignment.topCenter,
        children: [
          widget.child,
          if (widget.showIndicator)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Material(
                color: Colors.black87,
                borderRadius: BorderRadius.circular(16),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  child: Text(
                    '${widget.scalePercent}%',
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
