import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/core/connectivity/online_status_provider.dart';
import 'package:lf_chords/core/widgets/offline_banner.dart';

class _OfflineNotifier extends OnlineStatusNotifier {
  @override
  bool build() => false;
}

class _OnlineNotifier extends OnlineStatusNotifier {
  @override
  bool build() => true;
}

void main() {
  testWidgets('shows exact web copy when offline', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          onlineStatusProvider.overrideWith(_OfflineNotifier.new),
        ],
        child: const MaterialApp(
          home: Scaffold(body: OfflineBanner()),
        ),
      ),
    );

    expect(find.text(OfflineBanner.message), findsOneWidget);
  });

  testWidgets('hidden when online', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          onlineStatusProvider.overrideWith(_OnlineNotifier.new),
        ],
        child: const MaterialApp(
          home: Scaffold(body: OfflineBanner()),
        ),
      ),
    );

    expect(find.text(OfflineBanner.message), findsNothing);
  });
}
