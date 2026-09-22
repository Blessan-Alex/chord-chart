import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/core/routing/app_router.dart';
import 'package:lf_chords/core/theme/app_theme.dart';
import 'package:lf_chords/providers/theme_providers.dart';

class LfChordsApp extends ConsumerWidget {
  const LfChordsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.read(goRouterProvider);
    final themeController = ref.watch(themeControllerProvider);

    return ListenableBuilder(
      listenable: themeController,
      builder: (context, _) {
        return MaterialApp.router(
          title: 'LF Chords',
          theme: buildLightTheme(),
          darkTheme: buildDarkTheme(),
          themeMode: themeController.mode,
          routerConfig: router,
        );
      },
    );
  }
}
