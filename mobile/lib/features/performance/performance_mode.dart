import 'package:lf_chords/domain/chart_display.dart';

bool isMobileLayout(double viewportWidth) {
  return viewportWidth < performanceBreakpointPx;
}

bool isPerformanceMode({
  required double viewportWidth,
  required bool hasPlaylist,
}) {
  return computeWrapEnabled(
    viewportWidth: viewportWidth,
    hasPlaylist: hasPlaylist,
  );
}
