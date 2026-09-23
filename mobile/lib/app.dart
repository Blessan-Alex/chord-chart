import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/core/connectivity/online_status_provider.dart';
import 'package:lf_chords/core/routing/app_router.dart';
import 'package:lf_chords/core/theme/app_theme.dart';
import 'package:lf_chords/core/widgets/offline_banner.dart';
import 'package:lf_chords/providers/theme_providers.dart';

class LfChordsApp extends ConsumerWidget {
  const LfChordsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.read(goRouterProvider);
    final themeController = ref.watch(themeControllerProvider);
    final online = ref.watch(onlineStatusProvider);

    return ListenableBuilder(
      listenable: themeController,
      builder: (context, _) {
        return MaterialApp.router(
          title: 'LF Chords',
          theme: buildLightTheme(),
          darkTheme: buildDarkTheme(),
          themeMode: themeController.mode,
          routerConfig: router,
          builder: (context, child) {
            return Column(
              children: [
                const OfflineBanner(),
                Expanded(
                  child: MediaQuery.removePadding(
                    context: context,
                    removeTop: !online,
                    child: child ?? const SizedBox.shrink(),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
