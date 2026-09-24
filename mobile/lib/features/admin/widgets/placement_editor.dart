import 'package:flutter/material.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/data/models/song.dart';
import 'package:lf_chords/domain/chord_pro_parser.dart';
import 'package:lf_chords/features/song/widgets/chord_line.dart';

class PlacementEditor extends StatefulWidget {
  const PlacementEditor({
    super.key,
    required this.sections,
    required this.originalKey,
    required this.onSectionsChanged,
  });

  final List<Section> sections;
  final String originalKey;
  final ValueChanged<List<Section>> onSectionsChanged;

  @override
  State<PlacementEditor> createState() => _PlacementEditorState();
}

class _PlacementEditorState extends State<PlacementEditor> {
  void _updateLine(int sIndex, int lIndex, String chordProLine) {
    widget.onSectionsChanged(
      widget.sections.asMap().entries.map((se) {
        if (se.key != sIndex) {
          return se.value;
        }
        return Section(
          label: se.value.label,
          lines: se.value.lines.asMap().entries.map((le) {
            if (le.key != lIndex) {
              return le.value;
            }
            return parseChordProLine(chordProLine);
          }).toList(),
        );
      }).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width - 48;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var s = 0; s < widget.sections.length; s++) ...[
          Text(
            widget.sections[s].label,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 8),
          for (var l = 0; l < widget.sections[s].lines.length; l++) ...[
            _LineEditorField(
              key: ValueKey('line-$s-$l'),
              initialText: serializeChordProLine(widget.sections[s].lines[l]),
              onChanged: (value) => _updateLine(s, l, value),
            ),
            const SizedBox(height: 8),
            ChordLineWidget(
              line: widget.sections[s].lines[l],
              originalKey: widget.originalKey,
              targetKey: widget.originalKey,
              viewMode: SongViewMode.chords,
              wrapEnabled: false,
              maxChars: 9999,
              maxWidth: width,
              fontSize: 16,
              languageTags: const [],
            ),
            const SizedBox(height: 16),
          ],
        ],
      ],
    );
  }
}

class _LineEditorField extends StatefulWidget {
  const _LineEditorField({
    super.key,
    required this.initialText,
    required this.onChanged,
  });

  final String initialText;
  final ValueChanged<String> onChanged;

  @override
  State<_LineEditorField> createState() => _LineEditorFieldState();
}

class _LineEditorFieldState extends State<_LineEditorField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialText);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant _LineEditorField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialText == oldWidget.initialText) {
      return;
    }
    final fromField = serializeChordProLine(parseChordProLine(_controller.text));
    if (widget.initialText != fromField) {
      _controller.text = widget.initialText;
    }
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      decoration: const InputDecoration(
        labelText: 'Line (ChordPro)',
        border: OutlineInputBorder(),
      ),
      onChanged: widget.onChanged,
    );
  }
}
