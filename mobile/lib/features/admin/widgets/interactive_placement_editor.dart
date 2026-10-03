import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/chord_placement.dart';
import 'package:lf_chords/domain/chord_source_sync.dart';
import 'package:lf_chords/domain/performance_preferences.dart';
import 'package:lf_chords/features/admin/placement/placement_sections_controller.dart';
import 'package:lf_chords/features/admin/widgets/chord_placement_sheet.dart';
import 'package:lf_chords/features/admin/widgets/lyric_line_placement_editor.dart';
import 'package:lf_chords/features/admin/widgets/placement_toolbar.dart';
import 'package:lf_chords/features/song/widgets/chart_theme_scope.dart';

class InteractivePlacementEditor extends StatefulWidget {
  const InteractivePlacementEditor({
    super.key,
    required this.sections,
    required this.originalKey,
    required this.onSectionsChanged,
  });

  final List<Section> sections;
  final String originalKey;
  final ValueChanged<List<Section>> onSectionsChanged;

  @override
  State<InteractivePlacementEditor> createState() =>
      _InteractivePlacementEditorState();
}

class _InteractivePlacementEditorState extends State<InteractivePlacementEditor> {
  late PlacementSectionsController _controller;

  @override
  void initState() {
    super.initState();
    _controller = PlacementSectionsController(
      initialSections: widget.sections,
      onSectionsChanged: widget.onSectionsChanged,
    );
  }

  @override
  void didUpdateWidget(covariant InteractivePlacementEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (sectionsSignature(widget.sections) !=
        sectionsSignature(oldWidget.sections)) {
      _controller.syncFromParent(widget.sections);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handlePlaceSlot(int sIndex, int lIndex, PlacementSlot slot) {
    _controller.openSlot(sIndex, lIndex, slot);
  }

  void _handleChordTap(int sIndex, int lIndex, ChordMark mark) {
    _controller.beginChordEdit(sIndex, lIndex, mark);
  }

  List<String> _quickPicks() {
    final seen = <String>{};
    final picks = <String>[];
    for (final chord in [
      ..._controller.recents,
      ..._controller.diatonicPalette(widget.originalKey),
    ]) {
      if (chord.isEmpty || seen.contains(chord)) {
        continue;
      }
      seen.add(chord);
      picks.add(chord);
    }
    return picks;
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width - 48;
    final themeColors = ChartThemeColors.resolve(
      ChartTheme.system,
      Theme.of(context).brightness,
    );

    return ChartThemeScope(
      colors: themeColors,
      child: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final sections = _controller.sections;
          final active = _controller.active;
          final sheetOpen = active != null;
          final sheetTitle = _controller.canRemoveActiveChord
              ? 'Edit chord'
              : 'Place chord';

          return Shortcuts(
            shortcuts: const {
              SingleActivator(LogicalKeyboardKey.escape): _DismissPlacementIntent(),
            },
            child: Actions(
              actions: {
                _DismissPlacementIntent: CallbackAction<_DismissPlacementIntent>(
                  onInvoke: (_) {
                    if (_controller.active != null) {
                      _controller.clearPlacement();
                    } else if (_controller.quickChord != null) {
                      _controller.disarmQuickChord();
                    }
                    return null;
                  },
                ),
              },
              child: Stack(
                children: [
                  SingleChildScrollView(
                    padding: EdgeInsets.only(bottom: sheetOpen ? 260 : 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        PlacementToolbar(
                      chordCount: _controller.chordCount,
                      chordedLines: _controller.chordedLines,
                      lineCount: _controller.lineCount,
                      canUndo: _controller.canUndo,
                      onUndo: _controller.undo,
                      quickChord: _controller.quickChord,
                      lastChord: _controller.lastChord,
                      onToggleQuickChord: _controller.toggleQuickChord,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Tap lyrics or a gap to place a chord. Turn on Quick place to repeat the last chord.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 16),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: Theme.of(context).dividerColor,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            for (var s = 0; s < sections.length; s++) ...[
                              Text(
                                '{${sections[s].label}}',
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: 1.1,
                                    ),
                              ),
                              const SizedBox(height: 8),
                              for (var l = 0;
                                  l < sections[s].lines.length;
                                  l++) ...[
                                LyricLinePlacementEditor(
                          key: ValueKey(
                            'place-$s-$l-${sections[s].lines[l].lyrics}',
                          ),
                          line: sections[s].lines[l],
                          originalKey: widget.originalKey,
                          activeSlot: active != null &&
                                  active.sIndex == s &&
                                  active.lIndex == l
                              ? active.slot
                              : null,
                          pendingChord: active != null &&
                                  active.sIndex == s &&
                                  active.lIndex == l
                              ? active.currentVal
                              : '',
                          maxWidth: width,
                          onPlaceSlot: (slot) => _handlePlaceSlot(s, l, slot),
                          onChordTap: (mark) => _handleChordTap(s, l, mark),
                        ),
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          onPressed: () => _controller.insertChordLine(s, l),
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('+ Chord line below'),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size.fromHeight(44),
                          ),
                        ),
                                const SizedBox(height: 16),
                              ],
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
                  if (sheetOpen)
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: ChordPlacementSheet(
                        title: sheetTitle,
                        targetLabel: _controller.activeTargetLabel,
                        value: active!.currentVal,
                        error: _controller.chordError,
                        quickPicks: _quickPicks(),
                        canRemove: _controller.canRemoveActiveChord,
                        onChanged: _controller.updateActiveChordValue,
                        onPick: (chord) {
                          _controller.updateActiveChordValue(chord);
                          _controller.placeChord(rawValue: chord);
                        },
                        onPlace: () => _controller.placeChord(),
                        onPlaceNext: () =>
                            _controller.placeChord(advance: true),
                        onRemove: _controller.removeChord,
                        onCancel: _controller.clearPlacement,
                        onMoveSlotPrev: () => _controller.moveSlot(-1),
                        onMoveSlotNext: () => _controller.moveSlot(1),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _DismissPlacementIntent extends Intent {
  const _DismissPlacementIntent();
}
