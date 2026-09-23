import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/network/join_api_client.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/safe_redirect.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/playlist_providers.dart';

class JoinPlaylistScreen extends ConsumerStatefulWidget {
  const JoinPlaylistScreen({super.key, required this.token});

  final String token;

  @override
  ConsumerState<JoinPlaylistScreen> createState() => _JoinPlaylistScreenState();
}

class _JoinPlaylistScreenState extends ConsumerState<JoinPlaylistScreen> {
  String? _error;
  bool _joining = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _tryJoin());
  }

  Future<void> _tryJoin() async {
    final auth = ref.read(authControllerProvider).session;
    if (auth.loading || auth.user == null || widget.token.isEmpty) {
      return;
    }
    if (_joining || _error != null) {
      return;
    }

    setState(() => _joining = true);

    try {
      var idToken = await auth.user!.getIdToken();
      if (idToken == null) {
        throw StateError('Sign in required');
      }
      final client = ref.read(joinApiClientProvider);
      String sessionId;
      try {
        sessionId = await client.joinByInviteToken(
          tokenRaw: widget.token,
          idToken: idToken,
        );
      } on JoinApiException catch (error) {
        if (error.statusCode != 401) {
          rethrow;
        }
        idToken = await auth.user!.getIdToken(true);
        if (idToken == null) {
          throw StateError('Sign in required');
        }
        sessionId = await client.joinByInviteToken(
          tokenRaw: widget.token,
          idToken: idToken,
        );
      }
      invalidateUserPlaylistCaches(ref);
      if (!mounted) {
        return;
      }
      context.go(RoutePaths.playlistDetail(sessionId));
    } on FirebaseAuthException catch (error) {
      setState(() {
        _error = error.message ?? 'Could not join playlist.';
        _joining = false;
      });
    } catch (error) {
      setState(() {
        _error = error.toString().replaceFirst('JoinApiException: ', '');
        _joining = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.token.isEmpty) {
      return const Scaffold(
        body: Center(child: Text('Invalid invite link.')),
      );
    }

    final session = ref.watch(authSessionProvider);
    final joinPath = RoutePaths.joinPlaylist(widget.token);
    final safeNext = getSafeRedirectPath(joinPath) ?? joinPath;
    final encodedNext = Uri.encodeComponent(safeNext);

    ref.listen(authSessionProvider, (_, next) {
      if (!next.loading && next.user != null && !_joining && _error == null) {
        unawaited(_tryJoin());
      }
    });

    if (session.loading || (session.user != null && _error == null)) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Joining playlist…'),
              SizedBox(height: 16),
              CircularProgressIndicator(),
            ],
          ),
        ),
      );
    }

    if (session.user == null) {
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

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
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
}
