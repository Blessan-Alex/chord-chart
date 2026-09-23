import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    (RoutePaths.home, Icons.home_outlined, Icons.home, 'Home'),
    (RoutePaths.playlists, Icons.queue_music_outlined, Icons.queue_music, 'Playlists'),
    (RoutePaths.groups, Icons.groups_outlined, Icons.groups, 'Groups'),
    (RoutePaths.profile, Icons.person_outline, Icons.person, 'Profile'),
  ];

  static int selectedIndexForPath(String location) {
    for (var i = RoutePaths.shellBranchPaths.length - 1; i >= 0; i--) {
      final path = RoutePaths.shellBranchPaths[i];
      if (location == path || location.startsWith('$path/')) {
        return i;
      }
    }
    return 0;
  }

  void _onTap(BuildContext context, int index) {
    if (index < 0 || index >= _destinations.length) {
      return;
    }

    final branchCount = navigationShell.route.branches.length;
    if (branchCount != _destinations.length) {
      // Shell branch count only updates on full restart (not hot reload).
      context.go(_destinations[index].$1);
      return;
    }

    final selectedIndex = selectedIndexForPath(
      GoRouterState.of(context).uri.path,
    );
    navigationShell.goBranch(
      index,
      initialLocation: index == selectedIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    assert(
      () {
        if (navigationShell.route.branches.length != _destinations.length) {
          debugPrint(
            'AppShell: ${navigationShell.route.branches.length} shell branches '
            'but ${_destinations.length} nav tabs — hot restart required after '
            'adding a tab.',
          );
        }
        return true;
      }(),
    );

    final location = GoRouterState.of(context).uri.path;
    final selectedIndex = selectedIndexForPath(location);

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) => _onTap(context, index),
        destinations: [
          for (final item in _destinations)
            NavigationDestination(
              icon: Icon(item.$2),
              selectedIcon: Icon(item.$3),
              label: item.$4,
            ),
        ],
      ),
    );
  }
}
