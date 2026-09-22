import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/safe_redirect.dart';
import 'package:lf_chords/features/auth/widgets/signup_form.dart';
import 'package:lf_chords/providers/auth_providers.dart';

class SignupScreen extends ConsumerWidget {
  const SignupScreen({super.key, this.nextPath});

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
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Create your account',
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  if (nextPath != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      "You'll return to your invite after signing up.",
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                  const SizedBox(height: 24),
                  SignupForm(
                    loading: session.loading,
                    onCheckUsername: auth.checkUsernameAvailable,
                    onSubmit: (displayName, username, email, password) async {
                      await auth.signUp(
                        email: email,
                        password: password,
                        displayName: displayName,
                        username: username,
                      );
                      await navigateAfterAuth();
                    },
                    onGoogleSignIn: () async {
                      await auth.signInWithGoogle();
                      await navigateAfterAuth();
                    },
                    onNavigateToLogin: () {
                      final next = nextPath != null
                          ? '?next=${Uri.encodeComponent(nextPath!)}'
                          : '';
                      context.push('${RoutePaths.login}$next');
                    },
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
