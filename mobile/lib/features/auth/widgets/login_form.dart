import 'package:flutter/material.dart';
import 'package:lf_chords/domain/auth_errors.dart';
import 'package:lf_chords/features/auth/widgets/auth_divider.dart';
import 'package:lf_chords/features/auth/widgets/google_sign_in_button.dart';

class LoginForm extends StatefulWidget {
  const LoginForm({
    super.key,
    required this.onSubmit,
    this.onGoogleSignIn,
    this.loading = false,
    required this.onNavigateToSignup,
  });

  final Future<void> Function(String email, String password) onSubmit;
  final Future<void> Function()? onGoogleSignIn;
  final bool loading;
  final VoidCallback onNavigateToSignup;

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  String? _error;
  bool _submitting = false;
  bool _googleSubmitting = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    setState(() => _error = null);
    setState(() => _submitting = true);
    try {
      await widget.onSubmit(
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
          ),
          const SizedBox(height: 16),
          const AuthDivider(),
          const SizedBox(height: 16),
        ],
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          decoration: const InputDecoration(
            labelText: 'Email',
            hintText: 'you@example.com',
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _passwordController,
          obscureText: true,
          autofillHints: const [AutofillHints.password],
          decoration: const InputDecoration(labelText: 'Password'),
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
          child: Text(_submitting ? 'Signing in…' : 'Sign in'),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: disabled ? null : widget.onNavigateToSignup,
          child: const Text('Create account'),
        ),
      ],
    );
  }
}
