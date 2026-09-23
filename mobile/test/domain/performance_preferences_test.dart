import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/performance_preferences.dart';

void main() {
  test('clamps zoom scale', () {
    expect(clampChartScale(0.5), chartScaleMin);
    expect(clampChartScale(3), chartScaleMax);
    expect(clampChartScale(1.2), 1.2);
  });

  test('snaps zoom scale to step', () {
    expect(snapChartScale(1.12), 1.1);
    expect(snapChartScale(1.13), 1.15);
  });
}
