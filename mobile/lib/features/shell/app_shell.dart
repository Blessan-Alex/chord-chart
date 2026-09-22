import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    (RoutePaths.home, Icons.home_outlined, Icons.home, 'Home'),
    (RoutePaths.playlists, Icons.queue_music_outlined, Icons.queue_music, 'Playlists'),
    (RoutePaths.profile, Icons.person_outline, Icons.person, 'Profile'),
  ];

  void _onTap(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: _onTap,
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
