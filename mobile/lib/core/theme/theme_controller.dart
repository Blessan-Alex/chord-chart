import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _themeStorageKey = 'lf-theme';

enum AppThemePreference { light, dark }

extension AppThemePreferenceX on AppThemePreference {
  ThemeMode get themeMode =>
      this == AppThemePreference.dark ? ThemeMode.dark : ThemeMode.light;
}

class ThemeController extends ChangeNotifier {
  ThemeController(this._prefs) {
    _mode = _readFromPrefs();
  }

  final SharedPreferences _prefs;
  ThemeMode _mode = ThemeMode.light;

  ThemeMode get mode => _mode;

  ThemeMode _readFromPrefs() {
    final stored = _prefs.getString(_themeStorageKey);
    if (stored == 'dark') {
      return ThemeMode.dark;
    }
    return ThemeMode.light;
  }

  void setTheme(AppThemePreference preference) {
    _mode = preference.themeMode;
    _prefs.setString(
      _themeStorageKey,
      preference == AppThemePreference.dark ? 'dark' : 'light',
    );
    notifyListeners();
  }

  void toggleDark(bool isDark) {
    setTheme(
      isDark ? AppThemePreference.dark : AppThemePreference.light,
    );
  }
}

Future<ThemeController> createThemeController() async {
  final prefs = await SharedPreferences.getInstance();
  return ThemeController(prefs);
}
