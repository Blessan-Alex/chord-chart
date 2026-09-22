import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:lf_chords/domain/auth_errors.dart';
import 'package:lf_chords/domain/validation.dart';
import 'package:lf_chords/features/auth/widgets/auth_divider.dart';
import 'package:lf_chords/features/auth/widgets/google_sign_in_button.dart';

class SignupForm extends StatefulWidget {
  const SignupForm({
    super.key,
    required this.onSubmit,
    this.onGoogleSignIn,
    required this.onCheckUsername,
    this.loading = false,
    required this.onNavigateToLogin,
  });

  final Future<void> Function(
    String displayName,
    String username,
    String email,
    String password,
  ) onSubmit;
  final Future<void> Function()? onGoogleSignIn;
  final Future<bool> Function(String username) onCheckUsername;
  final bool loading;
  final VoidCallback onNavigateToLogin;

  @override
  State<SignupForm> createState() => _SignupFormState();
}

class _SignupFormState extends State<SignupForm> {
  final _displayNameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  String? _usernameError;
  String? _error;
  bool _submitting = false;
  bool _googleSubmitting = false;

  @override
  void dispose() {
    _displayNameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<bool> _validateUsernameField(String value) async {
    final result = validateUsername(value);
    if (result is UsernameInvalid) {
      setState(() => _usernameError = result.error);
      return false;
    }

    final available = await widget.onCheckUsername(
      (result as UsernameValid).normalized,
    );
    if (!available) {
      setState(() => _usernameError = 'That username is already taken');
      return false;
    }

    setState(() => _usernameError = null);
    return true;
  }

  Future<void> _handleSubmit() async {
    setState(() => _error = null);
    final usernameOk = await _validateUsernameField(_usernameController.text);
    if (!usernameOk) {
      return;
    }

    if (_passwordController.text.length < 6) {
      setState(() => _error = formatAuthError(
            FirebaseAuthException(code: 'weak-password'),
          ));
      return;
    }

    setState(() => _submitting = true);
    try {
      final normalized = validateUsername(_usernameController.text);
      if (normalized is! UsernameValid) {
        setState(() => _usernameError = (normalized as UsernameInvalid).error);
        return;
      }
      await widget.onSubmit(
        _displayNameController.text.trim(),
        normalized.normalized,
        _emailController.text.trim(),
        _passwordController.text,
      );
    } catch (err) {
      setState(() => _error = formatAuthError(err));
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _handleGoogle() async {
    final handler = widget.onGoogleSignIn;
    if (handler == null) {
      return;
    }
    setState(() => _error = null);
    setState(() => _googleSubmitting = true);
    try {
      await handler();
    } catch (err) {
      setState(() => _error = formatAuthError(err));
    } finally {
      if (mounted) {
        setState(() => _googleSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final disabled =
        _submitting || _googleSubmitting || widget.loading;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.onGoogleSignIn != null) ...[
          GoogleSignInButton(
            onPressed: _handleGoogle,
            disabled: disabled,
            label: 'Sign up with Google',
          ),
          const SizedBox(height: 16),
          const AuthDivider(),
          const SizedBox(height: 16),
        ],
        TextField(
          controller: _displayNameController,
          decoration: const InputDecoration(
            labelText: 'Display name',
            hintText: 'Alex Rivera',
          ),
          onEditingComplete: () {
            _displayNameController.text = _displayNameController.text.trim();
          },
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _usernameController,
          decoration: InputDecoration(
            labelText: 'Username',
            hintText: 'alexrivera',
            prefixText: '@',
            errorText: _usernameError,
          ),
          onChanged: (_) => setState(() => _usernameError = null),
          onEditingComplete: () async {
            if (_usernameController.text.trim().isNotEmpty) {
              await _validateUsernameField(_usernameController.text);
            }
          },
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: 'Email',
            hintText: 'you@example.com',
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _passwordController,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Password',
            hintText: '••••••••',
          ),
          autofillHints: const [AutofillHints.newPassword],
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(
            _error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: disabled ? null : _handleSubmit,
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
          ),
          child: Text(_submitting ? 'Creating account…' : 'Create account'),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: disabled ? null : widget.onNavigateToLogin,
          child: const Text('Sign in'),
        ),
      ],
    );
  }
}
