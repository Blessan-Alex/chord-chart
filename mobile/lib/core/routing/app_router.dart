import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/domain/safe_redirect.dart';
import 'package:lf_chords/features/admin/admin_dashboard_screen.dart';
import 'package:lf_chords/features/admin/admin_import_screen.dart';
import 'package:lf_chords/features/admin/admin_route_gate.dart';
import 'package:lf_chords/features/admin/song_edit_screen.dart';
import 'package:lf_chords/features/auth/login_screen.dart';
import 'package:lf_chords/features/auth/signup_screen.dart';
import 'package:lf_chords/features/groups/group_detail_screen.dart';
import 'package:lf_chords/features/groups/groups_screen.dart';
import 'package:lf_chords/features/join/join_playlist_screen.dart';
import 'package:lf_chords/features/library/home_screen.dart';
import 'package:lf_chords/features/onboarding/username_onboarding_screen.dart';
import 'package:lf_chords/features/profile/profile_screen.dart';
import 'package:lf_chords/features/shell/app_shell.dart';
import 'package:lf_chords/features/playlists/create_playlist_screen.dart';
import 'package:lf_chords/features/playlists/playlist_detail_screen.dart';
import 'package:lf_chords/features/playlists/playlists_screen.dart';
import 'package:lf_chords/features/song/song_screen.dart';
import 'package:lf_chords/providers/auth_providers.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

/// Single [GoRouter] instance; auth updates go through [GoRouter.refreshListenable].
final goRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.read(authControllerProvider);

  String? redirectLogic(GoRouterState state) {
    final session = auth.session;
    final location = state.uri.path;
    final nextParam = getSafeRedirectPath(state.uri.queryParameters['next']);

    final isAuthRoute =
        location == RoutePaths.login || location == RoutePaths.signup;
    final isOnboarding = location.startsWith(RoutePaths.usernameOnboarding);
    final isLoadingRoute = location == RoutePaths.loading;
    final isJoinRoute = location.startsWith(RoutePaths.joinPlaylistPrefix);

    if (location == RoutePaths.bootstrap) {
      return RoutePaths.home;
    }

    if (isLoadingRoute &&
        !session.loading &&
        session.profileResolved &&
        !session.signUpInProgress) {
      return RoutePaths.home;
    }

    if (session.loading ||
        session.signUpInProgress ||
        (session.user != null && !session.profileResolved)) {
      if (isAuthRoute || isJoinRoute || isLoadingRoute) {
        return null;
      }
      return RoutePaths.loading;
    }

    if (session.user != null &&
        session.profileResolved &&
        session.needsUsernameOnboarding &&
        isShellRoute(location) &&
        !isOnboarding) {
      final next = getSafeRedirectPath(location);
      final query = next != null ? '?next=${Uri.encodeComponent(next)}' : '';
      return '$usernameOnboardingPath$query';
    }

    if (session.user == null) {
      if (location == RoutePaths.playlists ||
          location.startsWith('${RoutePaths.playlists}/') ||
          location == RoutePaths.groups ||
          location.startsWith('${RoutePaths.groups}/') ||
          location == RoutePaths.profile) {
        return '${RoutePaths.login}?next=${Uri.encodeComponent(location)}';
      }
    }

    final adminRedirect = redirectNonAdminRoute(location, session);
    if (adminRedirect != null) {
      return adminRedirect;
    }

    if (isAuthRoute &&
        session.user != null &&
        session.profileResolved &&
        !session.signUpInProgress) {
      return resolvePostAuthDestinationForProfile(
        nextParam,
        session.profile,
      );
    }

    if (isOnboarding) {
      if (session.user == null) {
        final query = nextParam != null
            ? '?next=${Uri.encodeComponent(nextParam)}'
            : '';
        return '${RoutePaths.login}$query';
      }
      if (session.profile?.username != null &&
          session.profile!.username!.isNotEmpty) {
        return resolvePostAuthPath(nextParam, isAdmin: false);
      }
    }

    return null;
  }

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: RoutePaths.home,
    refreshListenable: auth,
    redirect: (context, state) => redirectLogic(state),
    routes: [
      GoRoute(
        path: RoutePaths.loading,
        builder: (context, state) => const Scaffold(
          body: Center(child: Text('Loading…')),
        ),
      ),
      GoRoute(
        path: RoutePaths.login,
        builder: (context, state) => LoginScreen(
          nextPath: getSafeRedirectPath(state.uri.queryParameters['next']),
        ),
      ),
      GoRoute(
        path: RoutePaths.signup,
        builder: (context, state) => SignupScreen(
          nextPath: getSafeRedirectPath(state.uri.queryParameters['next']),
        ),
      ),
      GoRoute(
        path: RoutePaths.usernameOnboarding,
        builder: (context, state) => UsernameOnboardingScreen(
          nextPath: getSafeRedirectPath(state.uri.queryParameters['next']),
        ),
      ),
      GoRoute(
        path: '${RoutePaths.joinPlaylistPrefix}:token',
        builder: (context, state) => JoinPlaylistScreen(
          token: state.pathParameters['token'] ?? '',
        ),
      ),
      GoRoute(
        path: RoutePaths.admin,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const AdminDashboardScreen(),
      ),
      GoRoute(
        path: RoutePaths.import,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const AdminImportScreen(),
      ),
      GoRoute(
        path: '/song/:id/edit',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => SongEditScreen(
          songId: state.pathParameters['id'] ?? '',
        ),
      ),
      GoRoute(
        path: '/song/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => SongScreen(
          songId: state.pathParameters['id'] ?? '',
          queryParameters: state.uri.queryParameters,
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.home,
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: HomeScreen(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.playlists,
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: PlaylistsScreen(),
                ),
                routes: [
                  GoRoute(
                    path: 'new',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) => const CreatePlaylistScreen(),
                  ),
                  GoRoute(
                    path: ':sessionId',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) => PlaylistDetailScreen(
                      sessionId: state.pathParameters['sessionId'] ?? '',
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.groups,
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: GroupsScreen(),
                ),
                routes: [
                  GoRoute(
                    path: ':groupId',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) => GroupDetailScreen(
                      groupId: state.pathParameters['groupId'] ?? '',
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.profile,
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: ProfileScreen(),
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
