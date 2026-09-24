import 'package:flutter/material.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/chord_source_sync.dart';
import 'package:lf_chords/domain/engine.dart';
import 'package:lf_chords/features/admin/widgets/placement_editor.dart';

class AdminSongComposer extends StatefulWidget {
  const AdminSongComposer({
    super.key,
    required this.title,
    required this.onTitleChanged,
    required this.artist,
    required this.onArtistChanged,
    required this.originalKey,
    required this.onOriginalKeyChanged,
    required this.tags,
    required this.onTagsChanged,
    required this.sections,
    required this.onSectionsChanged,
    this.notes,
    this.onNotesChanged,
  });

  final String title;
  final ValueChanged<String> onTitleChanged;
  final String artist;
  final ValueChanged<String> onArtistChanged;
  final String originalKey;
  final ValueChanged<String> onOriginalKeyChanged;
  final List<String> tags;
  final ValueChanged<List<String>> onTagsChanged;
  final List<Section> sections;
  final ValueChanged<List<Section>> onSectionsChanged;
  final String? notes;
  final ValueChanged<String>? onNotesChanged;

  @override
  State<AdminSongComposer> createState() => AdminSongComposerState();
}

class AdminSongComposerState extends State<AdminSongComposer> {
  _ComposerStep _step = _ComposerStep.source;
  late TextEditingController _sourceController;
  late TextEditingController _titleController;
  late TextEditingController _artistController;
  TextEditingController? _notesController;
  var _sourceDirty = false;
  String? _applyError;

  @override
  void initState() {
    super.initState();
    _sourceController = TextEditingController(
      text: syncSourceTextFromSections(widget.sections),
    );
    _titleController = TextEditingController(text: widget.title);
    _artistController = TextEditingController(text: widget.artist);
    if (widget.onNotesChanged != null) {
      _notesController = TextEditingController(text: widget.notes ?? '');
    }
  }

  @override
  void dispose() {
    _sourceController.dispose();
    _titleController.dispose();
    _artistController.dispose();
    _notesController?.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(AdminSongComposer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_sourceDirty &&
        sectionsSignature(oldWidget.sections) !=
            sectionsSignature(widget.sections)) {
      _sourceController.text = syncSourceTextFromSections(widget.sections);
    }
    if (widget.title != oldWidget.title &&
        _titleController.text != widget.title) {
      _titleController.text = widget.title;
    }
    if (widget.artist != oldWidget.artist &&
        _artistController.text != widget.artist) {
      _artistController.text = widget.artist;
    }
    if (_notesController != null &&
        widget.notes != oldWidget.notes &&
        _notesController!.text != (widget.notes ?? '')) {
      _notesController!.text = widget.notes ?? '';
    }
  }

  FlushResult getSectionsForSave() {
    if (!_sourceDirty) {
      return FlushOk(widget.sections);
    }
    return tryFlushChordSource(_sourceController.text);
  }

  void _flushToSections() {
    final result = tryFlushChordSource(_sourceController.text);
    if (result is FlushOk) {
      widget.onSectionsChanged(result.sections);
      setState(() {
        _sourceDirty = false;
        _applyError = null;
      });
    } else if (result is FlushError) {
      setState(() => _applyError = result.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SegmentedButton<_ComposerStep>(
          segments: const [
            ButtonSegment(value: _ComposerStep.source, label: Text('1 · Source')),
            ButtonSegment(
              value: _ComposerStep.placement,
              label: Text('2 · Placement'),
            ),
          ],
          selected: {_step},
          onSelectionChanged: (selection) {
            if (selection.first == _ComposerStep.placement) {
              _flushToSections();
              if (_applyError != null) {
                return;
              }
            }
            setState(() => _step = selection.first);
          },
        ),
        const SizedBox(height: 16),
        if (_step == _ComposerStep.source) ...[
          TextField(
            decoration: const InputDecoration(labelText: 'Title'),
            controller: _titleController,
            onChanged: widget.onTitleChanged,
          ),
          const SizedBox(height: 8),
          TextField(
            decoration: const InputDecoration(labelText: 'Artist'),
            controller: _artistController,
            onChanged: widget.onArtistChanged,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: allKeys.map((key) {
              return ChoiceChip(
                label: Text(key),
                selected: key == widget.originalKey,
                onSelected: (_) => widget.onOriginalKeyChanged(key),
              );
            }).toList(),
          ),
          const SizedBox(height: 8),
          LanguageTagPickerField(
            tags: widget.tags,
            onChanged: widget.onTagsChanged,
          ),
          if (widget.onNotesChanged != null && _notesController != null) ...[
            const SizedBox(height: 8),
            TextField(
              decoration: const InputDecoration(labelText: 'Notes'),
              maxLines: 2,
              controller: _notesController,
              onChanged: widget.onNotesChanged,
            ),
          ],
          const SizedBox(height: 16),
          Text('ChordPro source', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          TextField(
            controller: _sourceController,
            minLines: 8,
            maxLines: 16,
            decoration: InputDecoration(
              border: const OutlineInputBorder(),
              errorText: _applyError,
            ),
            onChanged: (_) {
              setState(() {
                _sourceDirty = true;
                _applyError = null;
              });
            },
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: () {
              _flushToSections();
              if (_applyError == null) {
                setState(() => _step = _ComposerStep.placement);
              }
            },
            child: const Text('Continue to placement'),
          ),
        ] else ...[
          Text(
            '${widget.title.trim().isEmpty ? 'Untitled' : widget.title.trim()} · ${widget.originalKey}',
          ),
          const SizedBox(height: 12),
          PlacementEditor(
            sections: widget.sections,
            originalKey: widget.originalKey,
            onSectionsChanged: widget.onSectionsChanged,
          ),
        ],
      ],
    );
  }
}

enum _ComposerStep { source, placement }

class LanguageTagPickerField extends StatelessWidget {
  const LanguageTagPickerField({
    super.key,
    required this.tags,
    required this.onChanged,
  });

  final List<String> tags;
  final ValueChanged<List<String>> onChanged;

  static const _options = ['lang:malayalam', 'lang:hindi', 'lang:marathi'];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      children: _options.map((tag) {
        final selected = tags.contains(tag);
        return FilterChip(
          label: Text(tag.replaceFirst('lang:', '')),
          selected: selected,
          onSelected: (value) {
            final next = [...tags];
            if (value) {
              next.add(tag);
            } else {
              next.remove(tag);
            }
            onChanged(next);
          },
        );
      }).toList(),
    );
  }
}
