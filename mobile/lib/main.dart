import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/app.dart';
import 'package:lf_chords/core/firebase/firebase_bootstrap.dart';
import 'package:lf_chords/core/theme/theme_controller.dart';
import 'package:lf_chords/providers/theme_providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await bootstrapFirebase();
  final themeController = await createThemeController();

  runApp(
    ProviderScope(
      overrides: [
        themeControllerProvider.overrideWithValue(themeController),
      ],
      child: const LfChordsApp(),
    ),
  );
}
