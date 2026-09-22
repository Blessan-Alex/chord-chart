import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/core/theme/theme_controller.dart';

final themeControllerProvider = Provider<ThemeController>((ref) {
  throw StateError(
    'themeControllerProvider must be overridden in ProviderScope',
  );
});
