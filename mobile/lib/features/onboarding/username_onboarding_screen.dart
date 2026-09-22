import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/auth_errors.dart';
import 'package:lf_chords/domain/safe_redirect.dart';
import 'package:lf_chords/domain/username_suggestions.dart';
import 'package:lf_chords/domain/validation.dart';
import 'package:lf_chords/providers/auth_providers.dart';

class UsernameOnboardingScreen extends ConsumerStatefulWidget {
  const UsernameOnboardingScreen({super.key, this.nextPath});

  final String? nextPath;

  @override
  ConsumerState<UsernameOnboardingScreen> createState() =>
      _UsernameOnboardingScreenState();
}

class _UsernameOnboardingScreenState
    extends ConsumerState<UsernameOnboardingScreen> {
  final _usernameController = TextEditingController();
  String? _usernameError;
  String? _error;
  bool _submitting = false;
  bool _signingOut = false;

  @override
  void dispose() {
    _usernameController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeSuggestUsername());
  }

  void _maybeSuggestUsername() {
    final session = ref.read(authSessionProvider);
    if (_usernameController.text.trim().isNotEmpty || session.user == null) {
      return;
    }
    final suggestion = suggestUsername(
      session.user!.email,
      session.user!.displayName ?? session.profile?.displayName,
    );
    if (suggestion.isNotEmpty) {
      _usernameController.text = suggestion;
    }
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    final result = validateUsername(_usernameController.text);
    if (result is UsernameInvalid) {
      setState(() => _usernameError = result.error);
      return;
    }

    final auth = ref.read(authControllerProvider);
    final available = await auth.checkUsernameAvailable(
      (result as UsernameValid).normalized,
    );
    if (!available) {
      setState(() => _usernameError = 'That username is already taken');
      return;
    }

    setState(() {
      _usernameError = null;
      _submitting = true;
    });
    try {
      await auth.claimUsername(result.normalized);
      if (!mounted) {
        return;
      }
      context.go(resolvePostAuthPath(widget.nextPath, isAdmin: false));
    } catch (err) {
      setState(() => _error = formatAuthError(err));
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _signOut() async {
    setState(() => _signingOut = true);
    try {
      await ref.read(authControllerProvider).signOut();
      if (!mounted) {
        return;
      }
      context.go(RoutePaths.login);
    } finally {
      if (mounted) {
        setState(() => _signingOut = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authSessionProvider);

    if (session.loading || session.user == null) {
      return const Scaffold(
        body: Center(child: Text('Loading…')),
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
                    'Choose your @username',
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Required so others can find you and share playlists with you.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  if (session.user!.displayName != null &&
                      session.user!.displayName!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      'Signed in as ${session.user!.displayName}',
                      textAlign: TextAlign.center,
                    ),
                  ],
                  const SizedBox(height: 24),
                  TextField(
                    controller: _usernameController,
                    decoration: InputDecoration(
                      labelText: 'Username',
                      prefixText: '@',
                      errorText: _usernameError,
                    ),
                    onChanged: (_) {
                      setState(() {
                        _usernameError = null;
                        _error = null;
                      });
                    },
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: (_submitting || _signingOut) ? null : _submit,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                    child: Text(_submitting ? 'Saving…' : 'Continue'),
                  ),
                  TextButton(
                    onPressed: (_submitting || _signingOut) ? null : _signOut,
                    child: Text(_signingOut ? 'Signing out…' : 'Use a different account'),
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
