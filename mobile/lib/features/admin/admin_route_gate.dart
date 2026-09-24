import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/providers/auth_providers.dart';

class AdminRouteGate extends ConsumerWidget {
  const AdminRouteGate({
    super.key,
    required this.child,
    this.signedOutMessage = 'Sign in to continue.',
    this.deniedMessage = 'Admin only.',
  });

  final Widget child;
  final String signedOutMessage;
  final String deniedMessage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authSessionProvider);

    if (session.loading || !session.profileResolved) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (session.user == null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(signedOutMessage),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => context.go(RoutePaths.login),
                  child: const Text('Sign in'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!session.isAdmin) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(deniedMessage),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => context.go(RoutePaths.home),
                  child: const Text('Back to library'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return child;
  }
}

String? redirectNonAdminRoute(String location, AuthSession session) {
  if (!location.startsWith(RoutePaths.admin) &&
      location != RoutePaths.import &&
      !location.endsWith('/edit')) {
    return null;
  }
  if (session.loading || !session.profileResolved) {
    return null;
  }
  if (session.user == null) {
    return '${RoutePaths.login}?next=${Uri.encodeComponent(location)}';
  }
  if (!session.isAdmin) {
    return RoutePaths.home;
  }
  return null;
}

bool isAdminRoute(String location) {
  return location == RoutePaths.admin ||
      location == RoutePaths.import ||
      RegExp(r'^/song/[^/]+/edit$').hasMatch(location);
}
