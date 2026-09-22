import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/providers/auth_providers.dart';

void main() {
  test('AuthSession copyWith clears nullable fields', () {
    const session = AuthSession(
      loading: false,
      profileResolved: true,
    );

    final cleared = session.copyWith(user: null, profile: null);

    expect(cleared.user, isNull);
    expect(cleared.profile, isNull);
  });
}
