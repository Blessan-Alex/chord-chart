import 'package:flutter/material.dart';
import 'package:lf_chords/domain/performance_preferences.dart';

class ChartThemeColors {
  const ChartThemeColors({
    required this.chordColor,
    required this.lyricColor,
    required this.sectionLabelColor,
    required this.sectionBackground,
    required this.chartBackground,
    required this.chartPadding,
  });

  final Color chordColor;
  final Color lyricColor;
  final Color sectionLabelColor;
  final Color? sectionBackground;
  final Color? chartBackground;
  final EdgeInsets chartPadding;

  static ChartThemeColors resolve(
    ChartTheme theme,
    Brightness platformBrightness,
  ) {
    switch (theme) {
      case ChartTheme.stage:
        return const ChartThemeColors(
          chordColor: Color(0xFFFFFF66),
          lyricColor: Colors.white,
          sectionLabelColor: Colors.white,
          sectionBackground: Color(0xFF1A1A1A),
          chartBackground: Colors.black,
          chartPadding: EdgeInsets.all(16),
        );
      case ChartTheme.dark:
        return const ChartThemeColors(
          chordColor: Color(0xFF6B9AFF),
          lyricColor: Color(0xFFC8C8C8),
          sectionLabelColor: Color(0xFFD0D0D0),
          sectionBackground: Color(0xFF1A1A1A),
          chartBackground: null,
          chartPadding: EdgeInsets.zero,
        );
      case ChartTheme.system:
        if (platformBrightness == Brightness.dark) {
          return const ChartThemeColors(
            chordColor: Color(0xFF6B9AFF),
            lyricColor: Color(0xFFC8C8C8),
            sectionLabelColor: Color(0xFFD0D0D0),
            sectionBackground: Color(0xFF1A1A1A),
            chartBackground: null,
            chartPadding: EdgeInsets.zero,
          );
        }
        return const ChartThemeColors(
          chordColor: Colors.black,
          lyricColor: Color(0xFF1A1A1A),
          sectionLabelColor: Color(0xFF333333),
          sectionBackground: Color(0xFFF5F5F5),
          chartBackground: null,
          chartPadding: EdgeInsets.zero,
        );
    }
  }
}

class ChartThemeScope extends InheritedWidget {
  const ChartThemeScope({
    super.key,
    required this.colors,
    required super.child,
  });

  final ChartThemeColors colors;

  static ChartThemeColors of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<ChartThemeScope>();
    assert(scope != null, 'ChartThemeScope not found');
    return scope!.colors;
  }

  @override
  bool updateShouldNotify(ChartThemeScope oldWidget) {
    return colors != oldWidget.colors;
  }
}
