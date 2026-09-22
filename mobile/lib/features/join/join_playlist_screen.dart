import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/safe_redirect.dart';
import 'package:lf_chords/providers/auth_providers.dart';

class JoinPlaylistScreen extends ConsumerWidget {
  const JoinPlaylistScreen({super.key, required this.token});

  final String token;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (token.isEmpty) {
      return const Scaffold(
        body: Center(child: Text('Invalid invite link.')),
      );
    }

    final session = ref.watch(authSessionProvider);
    final joinPath = RoutePaths.joinPlaylist(token);
    final safeNext = getSafeRedirectPath(joinPath) ?? joinPath;
    final encodedNext = Uri.encodeComponent(safeNext);

    if (session.loading) {
      return const Scaffold(
        body: Center(child: Text('Loading…')),
      );
    }

    if (session.user != null) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Join will be enabled in a later update.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => context.go(RoutePaths.playlists),
                    child: const Text('Go to playlists'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Join playlist',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Sign in to accept this invite and open the set list.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () =>
                      context.go('${RoutePaths.login}?next=$encodedNext'),
                  child: const Text('Sign in to join'),
                ),
                TextButton(
                  onPressed: () =>
                      context.go('${RoutePaths.signup}?next=$encodedNext'),
                  child: const Text('Create account'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
