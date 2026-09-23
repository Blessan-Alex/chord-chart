import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/playlist_providers.dart';

class CreatePlaylistScreen extends ConsumerStatefulWidget {
  const CreatePlaylistScreen({super.key});

  @override
  ConsumerState<CreatePlaylistScreen> createState() =>
      _CreatePlaylistScreenState();
}

class _CreatePlaylistScreenState extends ConsumerState<CreatePlaylistScreen> {
  final _titleController = TextEditingController();
  late DateTime _date;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _date = DateTime.now();
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    final user = ref.read(authControllerProvider).session.user;
    final profile = ref.read(authControllerProvider).session.profile;
    if (user == null || title.isEmpty) {
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final session = await ref.read(sessionRepositoryProvider).createSession(
            title: title,
            date: DateTime(_date.year, _date.month, _date.day, 12),
            createdBy: user.uid,
            ownerUsername: profile?.username,
          );
      invalidateUserPlaylistCaches(ref);
      if (mounted) {
        context.go(RoutePaths.playlistDetail(session.id));
      }
    } catch (error) {
      setState(() {
        _error = error.toString();
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr =
        '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}';

    return Scaffold(
      appBar: AppBar(title: const Text('New playlist')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextButton(
            onPressed: () => context.pop(),
            child: const Align(
              alignment: Alignment.centerLeft,
              child: Text('← Playlists'),
            ),
          ),
          Text(
            'Name your set list and pick a date.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _titleController,
            decoration: const InputDecoration(
              labelText: 'Title',
              hintText: 'e.g. Sunday Morning Worship',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Date'),
            subtitle: Text(dateStr),
            trailing: const Icon(Icons.calendar_today),
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _date,
                firstDate: DateTime(2020),
                lastDate: DateTime(2100),
              );
              if (picked != null) {
                setState(() => _date = picked);
              }
            },
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: Text(_submitting ? 'Creating…' : 'Create playlist'),
          ),
        ],
      ),
    );
  }
}
