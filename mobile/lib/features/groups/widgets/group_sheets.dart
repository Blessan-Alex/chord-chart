import 'package:flutter/material.dart';
import 'package:lf_chords/domain/group.dart';

class CreateGroupSheet extends StatefulWidget {
  const CreateGroupSheet({
    super.key,
    required this.busy,
    required this.onCreate,
  });

  final bool busy;
  final Future<void> Function(String name) onCreate;

  @override
  State<CreateGroupSheet> createState() => _CreateGroupSheetState();
}

class _CreateGroupSheetState extends State<CreateGroupSheet> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    try {
      await widget.onCreate(_controller.text);
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (error) {
      setState(() => _error = error.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.paddingOf(context).bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Create group', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            decoration: const InputDecoration(
              labelText: 'Group name',
              hintText: 'Youth Band',
              border: OutlineInputBorder(),
            ),
            autofocus: true,
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => _submit(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: widget.busy ? null : () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: widget.busy || _controller.text.trim().isEmpty
                    ? null
                    : _submit,
                child: Text(widget.busy ? 'Creating…' : 'Create'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class JoinGroupSheet extends StatefulWidget {
  const JoinGroupSheet({
    super.key,
    required this.busy,
    required this.onJoin,
  });

  final bool busy;
  final Future<void> Function(String code) onJoin;

  @override
  State<JoinGroupSheet> createState() => _JoinGroupSheetState();
}

class _JoinGroupSheetState extends State<JoinGroupSheet> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    try {
      await widget.onJoin(normalizeGroupInviteCode(_controller.text));
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (error) {
      setState(() => _error = error.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final codeLen = _controller.text.trim().length;
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.paddingOf(context).bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Join group', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            decoration: const InputDecoration(
              labelText: 'Invite code',
              hintText: 'AB12CD34',
              border: OutlineInputBorder(),
            ),
            maxLength: groupInviteCodeLength,
            autocorrect: false,
            autofocus: true,
            textCapitalization: TextCapitalization.characters,
            onChanged: (value) {
              final upper = value.toUpperCase();
              if (upper != value) {
                _controller.value = TextEditingValue(
                  text: upper,
                  selection: TextSelection.collapsed(offset: upper.length),
                );
              }
              setState(() {});
            },
          ),
          Text(
            'Enter the 8-character code from your group leader.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: widget.busy ? null : () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: widget.busy || codeLen != groupInviteCodeLength
                    ? null
                    : _submit,
                child: Text(widget.busy ? 'Joining…' : 'Join'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
