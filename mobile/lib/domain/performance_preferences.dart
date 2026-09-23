import 'package:shared_preferences/shared_preferences.dart';

const String chartZoomGlobalKey = 'lf-zoom-level';
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
