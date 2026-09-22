import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/features/auth/widgets/login_form.dart';

void main() {
  testWidgets('login form shows sign in button', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: LoginForm(
            onSubmit: (_, __) async {},
            onNavigateToSignup: () {},
          ),
        ),
      ),
    );

    expect(find.text('Sign in'), findsOneWidget);
  });
}
