import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/safe_redirect.dart';
import 'package:lf_chords/data/models/user_profile.dart';

void main() {
  group('getSafeRedirectPath', () {
    test('allows same-origin relative paths', () {
      expect(getSafeRedirectPath('/playlists/abc'), '/playlists/abc');
      expect(getSafeRedirectPath('/join/p/token'), '/join/p/token');
    });

    test('rejects external and malformed paths', () {
      expect(getSafeRedirectPath('//evil.com'), isNull);
      expect(getSafeRedirectPath('https://evil.com'), isNull);
      expect(getSafeRedirectPath(null), isNull);
      expect(getSafeRedirectPath(usernameOnboardingPath), isNull);
    });

    test('rejects mobile web-only paths', () {
      expect(getSafeRedirectPath('/admin'), isNull);
      expect(getSafeRedirectPath('/import'), isNull);
      expect(getSafeRedirectPath('/song/abc/edit'), isNull);
    });
  });

  group('resolvePostAuthPath', () {
    test('sends musicians to mobile home by default', () {
      expect(resolvePostAuthPath(null, isAdmin: false), RoutePaths.home);
      expect(resolvePostAuthPath(null, isAdmin: true), RoutePaths.home);
    });

    test('honours an explicit next path', () {
      expect(
        resolvePostAuthPath('/join/p/token', isAdmin: false),
        '/join/p/token',
      );
    });
  });

  group('resolvePostAuthDestination', () {
    const profileWithUsername = UserProfile(
      email: 'alex@example.com',
      displayName: 'Alex',
      username: 'alexrivera',
      usernameLower: 'alexrivera',
      role: 'musician',
    );

    test('routes users without a username to onboarding', () {
      expect(
        resolvePostAuthDestination(
          null,
          isAdmin: false,
          profile: const UserProfile(
            email: 'alex@example.com',
            displayName: 'Alex',
            role: 'musician',
          ),
        ),
        usernameOnboardingPath,
      );
      expect(
        resolvePostAuthDestination(
          '/playlists/abc',
          isAdmin: false,
          profile: const UserProfile(
            email: 'alex@example.com',
            displayName: 'Alex',
            role: 'musician',
          ),
        ),
        '${usernameOnboardingPath}?next=${Uri.encodeComponent('/playlists/abc')}',
      );
    });

    test('does not route to onboarding when profile failed to load', () {
      expect(
        resolvePostAuthDestination(null, isAdmin: false, profile: null),
        RoutePaths.home,
      );
      expect(
        resolvePostAuthDestination('/playlists/abc', isAdmin: false, profile: null),
        '/playlists/abc',
      );
    });

    test('sends users with a username to their destination', () {
      expect(
        resolvePostAuthDestination(null, isAdmin: false, profile: profileWithUsername),
        RoutePaths.home,
      );
      expect(
        resolvePostAuthDestination(
          '/playlists/abc',
          isAdmin: false,
          profile: profileWithUsername,
        ),
        '/playlists/abc',
      );
    });
  });
}
