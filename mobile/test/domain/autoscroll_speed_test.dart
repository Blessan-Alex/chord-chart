import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/autoscroll_speed.dart';

void main() {
  group('clampAutoscrollSpeed', () {
    test('clamps below minimum', () {
      expect(clampAutoscrollSpeed(0.05), autoscrollMinSpeed);
    });

    test('clamps above maximum', () {
      expect(clampAutoscrollSpeed(3), autoscrollMaxSpeed);
    });
  });

  group('autoscroll speed steps', () {
    test('decreases by 0.05 below 1x', () {
      expect(decreaseAutoscrollSpeed(0.15), 0.1);
    });

    test('decreases by 0.1 at and above 1x', () {
      expect(decreaseAutoscrollSpeed(1), 0.9);
    });

    test('increases from 0.95 to 1.0', () {
      expect(increaseAutoscrollSpeed(0.95), 1);
    });
  });

  group('resolveDefaultAutoscrollSpeed', () {
    test('touch default', () {
      expect(resolveDefaultAutoscrollSpeed(true), autoscrollDefaultTouch);
    });

    test('desktop default', () {
      expect(resolveDefaultAutoscrollSpeed(false), autoscrollDefaultDesktop);
    });
  });

  group('resolveAutoscrollPixelsPerSecond', () {
    test('applies touch multiplier', () {
      expect(
        resolveAutoscrollPixelsPerSecond(0.1, true),
        closeTo(1.7, 0.01),
      );
    });

    test('desktop rate', () {
      expect(
        resolveAutoscrollPixelsPerSecond(0.7, false),
        closeTo(14, 0.01),
      );
    });
  });

  group('formatAutoscrollSpeed', () {
    test('two decimals below 1', () {
      expect(formatAutoscrollSpeed(0.45), '0.45');
    });

    test('one decimal at 1+', () {
      expect(formatAutoscrollSpeed(1.2), '1.2');
    });
  });
}
