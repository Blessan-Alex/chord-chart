import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

const double autoscrollMinSpeed = 0.1;
const double autoscrollMaxSpeed = 2;
const double autoscrollDefaultDesktop = 0.7;
const double autoscrollDefaultTouch = 0.4;
const double autoscrollTouchRateMultiplier = 0.85;
const double autoscrollBasePxPerSec = 20;

const double _slowStep = 0.05;
const double _fastStep = 0.1;
const double _stepThreshold = 1;

double clampAutoscrollSpeed(double speed) {
  final clamped = speed.clamp(autoscrollMinSpeed, autoscrollMaxSpeed);
  return double.parse(clamped.toStringAsFixed(2));
}

double getAutoscrollSpeedStep(double speed) {
  return speed < _stepThreshold ? _slowStep : _fastStep;
}

double decreaseAutoscrollSpeed(double current) {
  return clampAutoscrollSpeed(current - getAutoscrollSpeedStep(current));
}

double increaseAutoscrollSpeed(double current) {
  return clampAutoscrollSpeed(current + getAutoscrollSpeedStep(current));
}

double resolveDefaultAutoscrollSpeed(bool isTouchDevice) {
  return isTouchDevice ? autoscrollDefaultTouch : autoscrollDefaultDesktop;
}

double resolveAutoscrollPixelsPerSecond(
  double speed,
  bool isTouchDevice,
) {
  final multiplier = isTouchDevice ? autoscrollTouchRateMultiplier : 1;
  return autoscrollBasePxPerSec * speed * multiplier;
}

String formatAutoscrollSpeed(double speed) {
  return speed < _stepThreshold
      ? speed.toStringAsFixed(2)
      : speed.toStringAsFixed(1);
}

/// Port of web `detectTouchAutoscrollDevice` using Flutter media signals.
bool detectTouchAutoscrollDevice(BuildContext context) {
  final media = MediaQuery.of(context);
  if (media.size.shortestSide <= 1024) {
    return true;
  }
  return defaultTargetPlatform == TargetPlatform.android ||
      defaultTargetPlatform == TargetPlatform.iOS;
}
