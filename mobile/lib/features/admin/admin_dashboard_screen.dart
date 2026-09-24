import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/data/models/admin_models.dart';
import 'package:lf_chords/data/models/song_index_entry.dart';
import 'package:lf_chords/domain/song_search_rank.dart';
import 'package:lf_chords/features/admin/admin_route_gate.dart';
import 'package:lf_chords/providers/admin_providers.dart';
import 'package:lf_chords/providers/song_index_providers.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() =>
      _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  AdminStats _stats = AdminStats.empty;
  var _loadingStats = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadStats());
  }

  Future<void> _loadStats() async {
    setState(() {
      _loadingStats = true;
      _error = null;
    });
    try {
      final stats =
          await ref.read(adminStatsRepositoryProvider).getAdminStats();
      if (mounted) {
        setState(() {
          _stats = stats;
          _loadingStats = false;
        });
      }
    } catch (err) {
      if (mounted) {
        setState(() {
          _error = err.toString();
          _loadingStats = false;
        });
      }
    }
  }

  Future<void> _archiveSong(String id, String title) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete song?'),
        content: Text('"$title" will be removed from the library.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }
    try {
      await ref.read(songsAdminRepositoryProvider).archiveSong(id);
      await ref.read(songIndexControllerProvider.notifier).retry();
      await _loadStats();
    } catch (err) {
      setState(() => _error = err.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final entries = ref.watch(songIndexEntriesProvider);
    final filtered = rankSongIndexResults(entries, _query);

    return AdminRouteGate(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Admin'),
          actions: [
            IconButton(
              tooltip: 'Refresh library',
              onPressed: () async {
                await ref.read(songIndexControllerProvider.notifier).retry();
                await _loadStats();
              },
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => context.push(RoutePaths.import),
          icon: const Icon(Icons.add),
          label: const Text('Add song'),
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextButton(
              onPressed: () => context.go(RoutePaths.home),
              child: const Text('← Library'),
            ),
            const SizedBox(height: 8),
            _StatsRow(stats: _stats, loading: _loadingStats),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Search songs…',
                border: OutlineInputBorder(),
              ),
              onChanged: (value) => setState(() => _query = value),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 16),
            if (entries.isEmpty && ref.watch(songIndexControllerProvider).loading)
              const Center(child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ))
            else if (filtered.isEmpty)
              Text(
                entries.isEmpty
                    ? 'No songs in the library yet.'
                    : 'No songs match your search.',
              )
            else
              ...filtered.map((entry) => _AdminSongTile(
                    entry: entry,
                    onEdit: () => context.push(RoutePaths.songEdit(entry.id)),
                    onDelete: () => _archiveSong(entry.id, entry.title),
                  )),
          ],
        ),
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.stats, required this.loading});

  final AdminStats stats;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    Widget cell(String label, int value) {
      return Expanded(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Text(
                  loading ? '…' : '$value',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                Text(label),
              ],
            ),
          ),
        ),
      );
    }

    return Row(
      children: [
        cell('Songs', stats.songCount),
        cell('Playlists', stats.playlistCount),
        cell('Groups', stats.groupCount),
      ],
    );
  }
}

class _AdminSongTile extends StatelessWidget {
  const _AdminSongTile({
    required this.entry,
    required this.onEdit,
    required this.onDelete,
  });

  final SongIndexEntry entry;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final secondary = entry.artist.isNotEmpty
        ? '${entry.artist} · Key of ${entry.key}'
        : 'Key of ${entry.key}';
    return Card(
      child: ListTile(
        title: Text(entry.title),
        subtitle: Text(secondary),
        trailing: Wrap(
          spacing: 4,
          children: [
            TextButton(onPressed: onEdit, child: const Text('Edit')),
            TextButton(
              onPressed: onDelete,
              style: TextButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error,
              ),
              child: const Text('Delete'),
            ),
          ],
        ),
      ),
    );
  }
}
