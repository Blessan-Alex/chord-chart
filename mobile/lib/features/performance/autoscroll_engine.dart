import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';
import 'package:lf_chords/domain/autoscroll_speed.dart';

/// rAF-style autoscroll on a [ScrollController] (web `useAutoscroll` parity).
class AutoscrollEngine {
  AutoscrollEngine({
    required TickerProvider vsync,
    required ScrollController scrollController,
  }) : _scrollController = scrollController {
    _ticker = vsync.createTicker(_handleTick);
  }

  ScrollController _scrollController;
  late final Ticker _ticker;
  bool active = false;
  bool paused = false;
  double speed = autoscrollDefaultDesktop;
  bool isTouchDevice = false;

  Duration? _lastTickTime;

  set scrollController(ScrollController value) {
    _scrollController = value;
  }

  void _handleTick(Duration elapsed) {
    if (!active || paused) {
      return;
    }
    if (_lastTickTime == null) {
      _lastTickTime = elapsed;
      return;
    }
    final deltaSeconds =
        (elapsed - _lastTickTime!).inMicroseconds / 1000000.0;
    _lastTickTime = elapsed;
    _scrollBy(
      deltaSeconds *
          resolveAutoscrollPixelsPerSecond(speed, isTouchDevice),
    );
  }

  void _scrollBy(double delta) {
    if (!_scrollController.hasClients) {
      return;
    }
    final position = _scrollController.position;
    // Web: scrollHeight - clientHeight > 4 → max scroll offset > 4.
    if (position.maxScrollExtent <= 4) {
      return;
    }
    final next = (position.pixels + delta)
        .clamp(position.minScrollExtent, position.maxScrollExtent);
    _scrollController.jumpTo(next);
  }

  void start() {
    speed = resolveDefaultAutoscrollSpeed(isTouchDevice);
    active = true;
    paused = false;
    _lastTickTime = null;
    if (!_ticker.isActive) {
      _ticker.start();
    }
  }

  void stop() {
    active = false;
    paused = false;
    _lastTickTime = null;
    if (_ticker.isActive) {
      _ticker.stop();
    }
  }

  void pause() {
    paused = true;
  }

  void resume() {
    paused = false;
    _lastTickTime = null;
  }

  void decreaseSpeed() {
    speed = decreaseAutoscrollSpeed(speed);
  }

  void increaseSpeed() {
    speed = increaseAutoscrollSpeed(speed);
  }

  void dispose() {
    if (_ticker.isActive) {
      _ticker.stop();
    }
    _ticker.dispose();
  }
}
