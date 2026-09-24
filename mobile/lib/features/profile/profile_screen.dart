import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/theme_providers.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _displayNameController = TextEditingController();
  final _usernameController = TextEditingController();
  bool _saving = false;
  bool _claiming = false;
  String? _saveError;
  String? _saveMessage;

  @override
  void dispose() {
    _displayNameController.dispose();
    _usernameController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncDisplayName());
  }

  void _syncDisplayName() {
    final session = ref.read(authSessionProvider);
    final name = session.profile?.displayName ??
        session.user?.displayName ??
        '';
    if (name.isNotEmpty) {
      _displayNameController.text = name;
    }
  }

  Future<void> _saveDisplayName() async {
    setState(() {
      _saveError = null;
      _saveMessage = null;
      _saving = true;
    });
    try {
      await ref
          .read(authControllerProvider)
          .updateDisplayName(_displayNameController.text);
      setState(() => _saveMessage = 'Display name updated.');
    } catch (err) {
      setState(() {
        _saveError = err is Exception
            ? err.toString().replaceFirst('Exception: ', '')
            : 'Could not update display name.';
      });
    } finally {
      setState(() => _saving = false);
    }
  }

  Future<void> _claimUsername() async {
    setState(() {
      _saveError = null;
      _saveMessage = null;
      _claiming = true;
    });
    try {
      await ref
          .read(authControllerProvider)
          .claimUsername(_usernameController.text);
      setState(() {
        _saveMessage =
            'Username saved. Others can share playlists with you now.';
        _usernameController.clear();
      });
    } catch (err) {
      setState(() {
        _saveError = err is Exception
            ? err.toString().replaceFirst('Exception: ', '')
            : 'Could not save username.';
      });
    } finally {
      setState(() => _claiming = false);
    }
  }

  Future<void> _signOut() async {
    await ref.read(authControllerProvider).signOut();
    if (mounted) {
      context.go(RoutePaths.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (_, next) {
      if (next.profile?.displayName != null &&
          _displayNameController.text.isEmpty) {
        _displayNameController.text = next.profile!.displayName;
      }
    });

    final session = ref.watch(authSessionProvider);
    final themeController = ref.watch(themeControllerProvider);
    final isDark = themeController.mode == ThemeMode.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (session.user == null)
            const Text('Sign in to manage your profile.')
          else ...[
            if (session.profile?.username != null &&
                session.profile!.username!.isNotEmpty)
              ListTile(
                title: const Text('Username'),
                subtitle: Text('@${session.profile!.username}'),
              )
            else ...[
              const Text('Username required for playlist sharing.'),
              const SizedBox(height: 8),
              TextField(
                controller: _usernameController,
                decoration: const InputDecoration(hintText: 'yourname'),
              ),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: (_claiming || _usernameController.text.trim().isEmpty)
                    ? null
                    : _claimUsername,
                child: Text(_claiming ? 'Saving…' : 'Set username'),
              ),
            ],
            ListTile(
              title: const Text('Email'),
              subtitle: Text(session.user!.email ?? ''),
            ),
            const Text('Role', style: TextStyle(fontWeight: FontWeight.w600)),
            const Text('Musician'),
            const SizedBox(height: 16),
            const Text('Display name', style: TextStyle(fontWeight: FontWeight.w600)),
            Row(
              children: [
                Expanded(
                  child: TextField(controller: _displayNameController),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: (_saving || _displayNameController.text.trim().isEmpty)
                      ? null
                      : _saveDisplayName,
                  child: Text(_saving ? 'Saving…' : 'Save'),
                ),
              ],
            ),
            if (_saveError != null)
              Text(
                _saveError!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            if (_saveMessage != null) Text(_saveMessage!),
          ],
          const SizedBox(height: 24),
          const Text('Theme', style: TextStyle(fontWeight: FontWeight.w600)),
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: false, label: Text('Light')),
              ButtonSegment(value: true, label: Text('Dark')),
            ],
            selected: {isDark},
            onSelectionChanged: (selection) {
              themeController.toggleDark(selection.first);
            },
          ),
          if (session.user != null) ...[
            if (session.isAdmin) ...[
              ListTile(
                leading: const Icon(Icons.admin_panel_settings_outlined),
                title: const Text('Admin'),
                subtitle: const Text('Library dashboard & song editor'),
                onTap: () => context.push(RoutePaths.admin),
              ),
              const Divider(),
            ],
            const SizedBox(height: 24),
            OutlinedButton(onPressed: _signOut, child: const Text('Sign out')),
          ],
          if (kDebugMode) ...[
            const SizedBox(height: 32),
            Text(
              'Firebase: song-db-5e4ed',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}
