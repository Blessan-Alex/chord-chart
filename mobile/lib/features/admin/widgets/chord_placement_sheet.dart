import 'package:flutter/material.dart';

class ChordPlacementSheet extends StatefulWidget {
  const ChordPlacementSheet({
    super.key,
    required this.title,
    required this.targetLabel,
    required this.value,
    required this.error,
    required this.quickPicks,
    required this.canRemove,
    required this.onChanged,
    required this.onPick,
    required this.onPlace,
    required this.onPlaceNext,
    required this.onRemove,
    required this.onCancel,
    this.onMoveSlotPrev,
    this.onMoveSlotNext,
  });

  final String title;
  final String? targetLabel;
  final String value;
  final String? error;
  final List<String> quickPicks;
  final bool canRemove;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onPick;
  final VoidCallback onPlace;
  final VoidCallback onPlaceNext;
  final VoidCallback onRemove;
  final VoidCallback onCancel;
  final VoidCallback? onMoveSlotPrev;
  final VoidCallback? onMoveSlotNext;

  @override
  State<ChordPlacementSheet> createState() => _ChordPlacementSheetState();
}

class _ChordPlacementSheetState extends State<ChordPlacementSheet> {
  late final TextEditingController _textController;
  String? _lastSyncedValue;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController(text: widget.value);
    _lastSyncedValue = widget.value;
  }

  @override
  void didUpdateWidget(covariant ChordPlacementSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != _lastSyncedValue &&
        widget.value != _textController.text) {
      _textController.text = widget.value;
      _lastSyncedValue = widget.value;
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewPaddingOf(context).bottom;

    return Material(
      elevation: 8,
      color: Theme.of(context).colorScheme.surface,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + bottomInset),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.title,
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        if (widget.targetLabel != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            widget.targetLabel!,
                            style: Theme.of(context).textTheme.bodySmall,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: widget.onCancel,
                    child: const Text('Cancel'),
                  ),
                ],
              ),
              if (widget.quickPicks.isNotEmpty) ...[
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final chord in widget.quickPicks)
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ActionChip(
                            label: Text(chord),
                            onPressed: () => widget.onPick(chord),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 8),
              TextField(
                controller: _textController,
                autofocus: true,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  labelText: 'Chord',
                  hintText: 'Am7, G/B…',
                  border: const OutlineInputBorder(),
                  errorText: widget.error,
                ),
                onChanged: (text) {
                  _lastSyncedValue = text;
                  widget.onChanged(text);
                },
                onSubmitted: (_) => widget.onPlace(),
              ),
              if (widget.onMoveSlotPrev != null ||
                  widget.onMoveSlotNext != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    IconButton(
                      tooltip: 'Previous slot',
                      onPressed: widget.onMoveSlotPrev,
                      icon: const Icon(Icons.chevron_left),
                    ),
                    Expanded(
                      child: Text(
                        'Move target',
                        style: Theme.of(context).textTheme.labelSmall,
                        textAlign: TextAlign.center,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Next slot',
                      onPressed: widget.onMoveSlotNext,
                      icon: const Icon(Icons.chevron_right),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: widget.onPlaceNext,
                    child: const Text('Place & next'),
                  ),
                  const Spacer(),
                  if (widget.canRemove)
                    TextButton(
                      onPressed: widget.onRemove,
                      style: TextButton.styleFrom(
                        foregroundColor: Theme.of(context).colorScheme.error,
                      ),
                      child: const Text('Remove chord'),
                    ),
                  FilledButton(
                    onPressed: widget.onPlace,
                    child: const Text('Place'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
