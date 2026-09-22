import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/safe_redirect.dart';
import 'package:lf_chords/features/auth/widgets/login_form.dart';
import 'package:lf_chords/providers/auth_providers.dart';

class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key, this.nextPath});

  final String? nextPath;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authSessionProvider);
    final auth = ref.watch(authControllerProvider);

    Future<void> navigateAfterAuth() async {
      final profile = await auth.reloadProfile();
      if (!context.mounted) {
        return;
      }
      context.go(
        resolvePostAuthDestinationForProfile(nextPath, profile ?? session.profile),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'LF Chords',
                    style: Theme.of(context).textTheme.headlineMedium,
                    textAlign: TextAlign.center,
                  ),
                  if (nextPath != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Sign in to continue.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                  const SizedBox(height: 24),
                  LoginForm(
                    loading: session.loading || session.isGoogleSigningIn,
                    onSubmit: (email, password) async {
                      await auth.signIn(email, password);
                      await navigateAfterAuth();
                    },
                    onGoogleSignIn: () async {
                      await auth.signInWithGoogle();
                      await navigateAfterAuth();
                    },
                    onNavigateToSignup: () {
                      final next = nextPath != null
                          ? '?next=${Uri.encodeComponent(nextPath!)}'
                          : '';
                      context.push('${RoutePaths.signup}$next');
                    },
                  ),
                  const SizedBox(height: 24),
                  TextButton(
                    onPressed: () => context.go(RoutePaths.home),
                    child: const Text('Browse without signing in'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
