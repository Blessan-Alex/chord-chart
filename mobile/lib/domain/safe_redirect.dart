import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/data/models/user_profile.dart';

/// Only allow same-origin relative paths after login/signup (mobile rules).
String? getSafeRedirectPath(String? next) {
  if (next == null || !next.startsWith('/') || next.startsWith('//')) {
    return null;
  }
  if (next.startsWith(usernameOnboardingPath)) {
    return null;
  }
  if (next.startsWith('/admin') ||
      next.startsWith('/import') ||
      next.contains('/edit')) {
    return null;
  }
  return next;
}

/// Default landing path after auth — mobile never routes to admin.
String resolvePostAuthPath(String? nextPath, {required bool isAdmin}) {
  if (nextPath != null) {
    return nextPath;
  }
  // ignore: isAdmin — kept for API parity with web; mobile always uses home.
  return mobileHomePath;
}

/// Route users with a loaded profile but no username through onboarding.
String resolvePostAuthDestination(
  String? nextPath, {
  required bool isAdmin,
  required UserProfile? profile,
}) {
  if (profile != null && (profile.username == null || profile.username!.isEmpty)) {
    if (nextPath != null) {
      return '$usernameOnboardingPath?next=${Uri.encodeComponent(nextPath)}';
    }
    return usernameOnboardingPath;
  }

  return resolvePostAuthPath(nextPath, isAdmin: isAdmin);
}

/// Post-login navigation — mobile ignores admin claim for routing.
String resolvePostAuthDestinationForProfile(
  String? nextPath,
  UserProfile? profile,
) {
  return resolvePostAuthDestination(
    nextPath,
    isAdmin: false,
    profile: profile,
  );
}

bool isShellRoute(String location) {
  for (final route in RoutePaths.shellRoutes) {
    if (location == route || location.startsWith('$route/')) {
      return true;
    }
  }
  return false;
}
