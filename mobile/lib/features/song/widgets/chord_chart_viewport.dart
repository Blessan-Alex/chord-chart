import 'package:flutter/material.dart';
import 'package:lf_chords/domain/performance_preferences.dart';

/// Minimum pinch movement before zoom applies (web: `PINCH_ACTIVATION_PX`).
const double chartPinchActivationScaleDelta = 0.05;

class ChordChartViewport extends StatefulWidget {
  const ChordChartViewport({
    super.key,
    required this.scale,
    required this.showIndicator,
    required this.onPinchCommit,
    required this.onDoubleTap,
    required this.child,
    this.gesturesEnabled = true,
  });

  /// Committed layout scale (font size / wrap); visual pinch uses transform until commit.
  final double scale;
  final bool showIndicator;
  final ValueChanged<double> onPinchCommit;
  final VoidCallback onDoubleTap;
  final Widget child;
  final bool gesturesEnabled;

  @override
  State<ChordChartViewport> createState() => _ChordChartViewportState();
}

class _ChordChartViewportState extends State<ChordChartViewport> {
  double? _pinchStartScale;
  double? _liveScale;
  bool _pinchArmed = false;
  bool _pinchIndicator = false;

  @override
  void didUpdateWidget(ChordChartViewport oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.scale != widget.scale && _liveScale == null) {
      // Parent committed a new scale (buttons / persist); clear stale pinch state.
      _pinchStartScale = null;
      _pinchArmed = false;
    }
  }

  void _onScaleStart(ScaleStartDetails _) {
    _pinchStartScale = widget.scale;
    _liveScale = null;
    _pinchArmed = false;
    _pinchIndicator = false;
  }

  void _onScaleUpdate(ScaleUpdateDetails details) {
    if (details.pointerCount < 2) {
      return;
    }
    final start = _pinchStartScale ?? widget.scale;
    final next = clampChartScale(start * details.scale);

    if (!_pinchArmed) {
      final delta = (details.scale - 1.0).abs();
      if (delta < chartPinchActivationScaleDelta) {
        return;
      }
      _pinchArmed = true;
      _pinchIndicator = true;
    }

    if (_liveScale == next) {
      return;
    }
    setState(() => _liveScale = next);
  }

  void _onScaleEnd(ScaleEndDetails _) {
    final didPinch = _pinchArmed;
    final committed = _liveScale;
    setState(() {
      _pinchStartScale = null;
      _liveScale = null;
      _pinchArmed = false;
      _pinchIndicator = false;
    });
    if (didPinch && committed != null) {
      widget.onPinchCommit(committed);
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayScale = _liveScale ?? widget.scale;
    final scalePercent = (displayScale * 100).round();
    final showBadge = widget.showIndicator || _pinchIndicator;
    final visualFactor =
        widget.scale > 0 ? displayScale / widget.scale : 1.0;
    final useTransform = _liveScale != null && (visualFactor - 1.0).abs() > 0.001;

    Widget chartChild = widget.child;
    if (useTransform) {
      chartChild = Transform.scale(
        scale: visualFactor,
        alignment: Alignment.topCenter,
        filterQuality: FilterQuality.medium,
        child: chartChild,
      );
    }

    final stack = Stack(
      alignment: Alignment.topCenter,
      clipBehavior: Clip.none,
      children: [
        chartChild,
        if (showBadge)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Material(
              color: Colors.black87,
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                child: Text(
                  '$scalePercent%',
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
              ),
            ),
          ),
      ],
    );

    if (!widget.gesturesEnabled) {
      return stack;
    }

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onScaleStart: _onScaleStart,
      onScaleUpdate: _onScaleUpdate,
      onScaleEnd: _onScaleEnd,
      onDoubleTap: widget.onDoubleTap,
      child: stack,
    );
  }
}
