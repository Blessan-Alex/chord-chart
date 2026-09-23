/// Mobile route paths (Phase 1).
abstract final class RoutePaths {
  static const bootstrap = '/';
  static const loading = '/loading';
  static const login = '/login';
  static const signup = '/signup';
  static const usernameOnboarding = '/onboarding/username';
  static const home = '/home';
  static const playlists = '/playlists';
  static const playlistsNew = '/playlists/new';
  static const profile = '/profile';
  static const groups = '/groups';
  static const joinPlaylistPrefix = '/join/p/';

  static String playlistDetail(String sessionId) =>
      '/playlists/${Uri.encodeComponent(sessionId)}';

  static String joinPlaylist(String token) =>
      '$joinPlaylistPrefix${Uri.encodeComponent(token)}';

  static String groupDetail(String groupId) =>
      '/groups/${Uri.encodeComponent(groupId)}';

  static String song(String id) => '/song/${Uri.encodeComponent(id)}';

  static const shellRoutes = {home, playlists, groups, profile};
}

/// Web `/` equivalent for post-auth landing on mobile.
const String mobileHomePath = RoutePaths.home;

const String usernameOnboardingPath = RoutePaths.usernameOnboarding;

const String loginPath = RoutePaths.login;

/// Firebase OAuth web client (type 3) for Google Sign-In + Firebase Auth on Android.
const String googleSignInWebClientId =
    '702566647801-opincmkmdljrekh6oevb9smdq893e59e.apps.googleusercontent.com';
