import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/app.dart';
import 'package:lf_chords/core/firebase/firebase_bootstrap.dart';
import 'package:lf_chords/core/theme/theme_controller.dart';
import 'package:lf_chords/providers/song_index_providers.dart';
import 'package:lf_chords/providers/theme_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await bootstrapFirebase();
  final prefs = await SharedPreferences.getInstance();
  final themeController = ThemeController(prefs);

  runApp(
    ProviderScope(
      overrides: [
        themeControllerProvider.overrideWithValue(themeController),
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: const LfChordsApp(),
    ),
  );
}
