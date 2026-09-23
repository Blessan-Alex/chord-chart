import 'package:shared_preferences/shared_preferences.dart';

const String chartZoomGlobalKey = 'lf-zoom-level';
/// Chart theme only — app light/dark uses `lf-theme` in [ThemeController].
const String chartThemeStorageKey = 'lf-chart-theme';

enum ChartTheme { system, dark, stage }

const List<ChartTheme> chartThemeCycle = [
  ChartTheme.system,
  ChartTheme.dark,
  ChartTheme.stage,
];

ChartTheme parseChartTheme(String? raw) {
  switch (raw) {
    case 'dark':
      return ChartTheme.dark;
    case 'stage':
      return ChartTheme.stage;
    case 'system':
    default:
      return ChartTheme.system;
  }
}

String chartThemeToStorage(ChartTheme theme) {
  switch (theme) {
    case ChartTheme.dark:
      return 'dark';
    case ChartTheme.stage:
      return 'stage';
    case ChartTheme.system:
      return 'system';
  }
}

Future<ChartTheme> readChartTheme(SharedPreferences prefs) async {
  final raw = prefs.getString(chartThemeStorageKey);
  return parseChartTheme(raw);
}

Future<void> writeChartTheme(
  SharedPreferences prefs,
  ChartTheme theme,
) async {
  await prefs.setString(chartThemeStorageKey, chartThemeToStorage(theme));
}

ChartTheme cycleChartTheme(ChartTheme current) {
  final idx = chartThemeCycle.indexOf(current);
  return chartThemeCycle[(idx + 1) % chartThemeCycle.length];
}

String chartThemeLabel(ChartTheme theme) {
  switch (theme) {
    case ChartTheme.system:
      return 'Auto';
    case ChartTheme.dark:
      return 'Dark';
    case ChartTheme.stage:
      return 'Stage';
  }
}

Future<int?> readLastSessionIndex(
  SharedPreferences prefs,
  String sessionId,
) async {
  final raw = prefs.getString('lf-session-$sessionId-last-index');
  if (raw == null) {
    return null;
  }
  return int.tryParse(raw);
}

const double chartScaleMin = 0.65;
const double chartScaleMax = 2;
const double chartScaleStep = 0.05;

double clampChartScale(double scale) {
  return scale.clamp(chartScaleMin, chartScaleMax).toDouble();
}

double snapChartScale(double scale) {
  final snapped = (scale / chartScaleStep).round() * chartScaleStep;
  return clampChartScale(double.parse(snapped.toStringAsFixed(2)));
}

Future<double> readGlobalZoom(SharedPreferences prefs) async {
  final raw = prefs.getString(chartZoomGlobalKey);
  if (raw == null) {
    return 1;
  }
  final parsed = double.tryParse(raw);
  if (parsed == null) {
    return 1;
  }
  return snapChartScale(parsed);
}

Future<void> writeGlobalZoom(SharedPreferences prefs, double scale) async {
  await prefs.setString(chartZoomGlobalKey, snapChartScale(scale).toString());
}

String sessionZoomKey(String sessionId) => 'lf-session-$sessionId-zoom';

Future<double?> readSessionZoom(
  SharedPreferences prefs,
  String sessionId,
) async {
  final raw = prefs.getString(sessionZoomKey(sessionId));
  if (raw == null) {
    return null;
  }
  final parsed = double.tryParse(raw);
  if (parsed == null) {
    return null;
  }
  return snapChartScale(parsed);
}

Future<void> writeSessionZoom(
  SharedPreferences prefs,
  String sessionId,
  double scale,
) async {
  await prefs.setString(
    sessionZoomKey(sessionId),
    snapChartScale(scale).toString(),
  );
}

Future<void> writeLastSessionIndex(
  SharedPreferences prefs,
  String sessionId,
  int index,
) async {
  await prefs.setString('lf-session-$sessionId-last-index', index.toString());
}
