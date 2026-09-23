import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/core/connectivity/online_status_provider.dart';

/// Web copy: `OfflineBanner.tsx` — sticky top, no dismiss.
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  static const message =
      "You're offline. Cached songs and sessions may still be available.";

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(onlineStatusProvider);
    if (online) {
      return const SizedBox.shrink();
    }

    return Semantics(
      container: true,
      liveRegion: true,
      label: message,
      child: Material(
        elevation: 4,
        color: const Color(0xFFFEF3C7),
        child: SafeArea(
          bottom: false,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Colors.amber.shade400),
              ),
            ),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF451A03),
                  ),
            ),
          ),
        ),
      ),
    );
  }
}
