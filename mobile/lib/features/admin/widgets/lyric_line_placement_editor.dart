import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/data/models/lyric_line.dart';
import 'package:lf_chords/data/models/song.dart';
import 'package:lf_chords/domain/chord_marks.dart';
import 'package:lf_chords/domain/chord_placement.dart';
import 'package:lf_chords/domain/chord_pro_display.dart';
import 'package:lf_chords/domain/chart_lyric_style.dart';
import 'package:lf_chords/domain/lyric_chords.dart';
import 'package:lf_chords/domain/placement_text_selection.dart';
import 'package:lf_chords/features/song/layout/chord_label_measure.dart';
import 'package:lf_chords/features/song/widgets/chart_theme_scope.dart';
import 'package:lf_chords/features/song/widgets/chord_row.dart';

const _lineStartZonePx = 14.0;
const _lineEndZonePx = 48.0;
const _minTouchTargetPx = 48.0;

bool _isWhitespaceChar(String? char) {
  return char != null && RegExp(r'\s').hasMatch(char);
}

int? placementGapCaretIndex(LyricLine line, PlacementSlot? slot) {
  if (slot == null) {
    return null;
  }
  if (slot is GapPlacementSlot) {
    return gapPreviewAnchor(line, slot.index);
  }
  if (slot is CharPlacementSlot &&
      slot.start < line.lyrics.length &&
      _isWhitespaceChar(line.lyrics[slot.start])) {
    return slot.start;
  }
  return null;
}

class LyricLinePlacementEditor extends StatefulWidget {
  const LyricLinePlacementEditor({
    super.key,
    required this.line,
    required this.originalKey,
    required this.activeSlot,
    required this.pendingChord,
    required this.onPlaceSlot,
    required this.onChordTap,
    required this.maxWidth,
    this.fontSize = 16,
    this.languageTags = const [],
  });

  final LyricLine line;
  final String originalKey;
  final PlacementSlot? activeSlot;
  final String pendingChord;
  final ValueChanged<PlacementSlot> onPlaceSlot;
  final ValueChanged<ChordMark> onChordTap;
  final double maxWidth;
  final double fontSize;
  final List<String> languageTags;

  @override
  State<LyricLinePlacementEditor> createState() =>
      _LyricLinePlacementEditorState();
}

class _LyricLinePlacementEditorState extends State<LyricLinePlacementEditor> {
  Map<int, double> _chordOffsets = {};

  @override
  void didUpdateWidget(covariant LyricLinePlacementEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.line.lyrics != widget.line.lyrics ||
        oldWidget.line.chords != widget.line.chords ||
        oldWidget.activeSlot != widget.activeSlot ||
        oldWidget.maxWidth != widget.maxWidth) {
      _scheduleMeasure();
    }
  }

  @override
  void initState() {
    super.initState();
    _scheduleMeasure();
  }

  void _scheduleMeasure() {
    WidgetsBinding.instance.addPostFrameCallback((_) => _measureOffsets());
  }

  void _measureOffsets() {
    if (!mounted) {
      return;
    }
    final packed = isChordOnlyLine(widget.line);
    if (packed) {
      setState(() => _chordOffsets = {});
      return;
    }

    final indices = gapMeasurementIndices(widget.line).toSet();
    indices.addAll(lyricChordStarts(widget.line.chords));
    final caret = placementGapCaretIndex(widget.line, widget.activeSlot);
    if (caret != null) {
      indices.add(caret);
    } else if (widget.activeSlot != null) {
      indices.add(slotPosition(widget.activeSlot!));
    }

    final colors = ChartThemeScope.of(context);
    final lyricStyle = chartLyricTextStyle(
      fontSize: widget.fontSize,
      tags: widget.languageTags,
    ).copyWith(color: colors.lyricColor);

    final textScaler = MediaQuery.textScalerOf(context);
    final measured = measureChordOffsets(
      widget.line.lyrics,
      indices.toList(),
      lyricStyle,
      widget.maxWidth,
      textScaler: textScaler,
    );

    if (measured != _chordOffsets) {
      setState(() => _chordOffsets = measured);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = ChartThemeScope.of(context);
    final lyricStyle = chartLyricTextStyle(
      fontSize: widget.fontSize,
      tags: widget.languageTags,
    ).copyWith(color: colors.lyricColor);
    final chordStyle = TextStyle(
      fontFamily: 'monospace',
      fontSize: widget.fontSize,
      fontWeight: FontWeight.w700,
      color: colors.chordColor,
    );

    final packed = isChordOnlyLine(widget.line);
    final gapZones = gapZonesForLine(widget.line);

    CharPlacementSlot? charSlot;
    if (widget.activeSlot is CharPlacementSlot) {
      charSlot = widget.activeSlot! as CharPlacementSlot;
    }

    ChordMark? previewMark;
    if (widget.pendingChord.trim().isNotEmpty && charSlot != null) {
      previewMark = createChordMark(
        widget.pendingChord,
        charSlot.start,
        charSlot.end,
      );
    }

    ChordRowGhost? ghost;
    final caret = placementGapCaretIndex(widget.line, widget.activeSlot);
    if (caret != null) {
      final left = _chordOffsets[caret];
      if (left != null) {
        final label = widget.pendingChord.trim().isEmpty
            ? '+'
            : widget.pendingChord.trim();
        ghost = ChordRowGhost(left: left, label: label);
      }
    }

    final showChordRow =
        widget.line.chords.isNotEmpty || previewMark != null || ghost != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showChordRow)
          ChordRowWidget(
            chords: widget.line.chords,
            originalKey: widget.originalKey,
            targetKey: widget.originalKey,
            viewMode: SongViewMode.chords,
            chordStyle: chordStyle,
            chordOffsets: packed ? null : _chordOffsets,
            packed: packed,
            maxWidth: widget.maxWidth,
            previewMark: previewMark,
            ghost: ghost,
            onChordTap: widget.onChordTap,
          ),
        if (widget.line.lyrics.trim().isEmpty)
          Semantics(
            button: true,
            label: describeSlot(widget.line, const PlacementSlot.gap(index: 0)),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () =>
                    widget.onPlaceSlot(const PlacementSlot.gap(index: 0)),
                child: SizedBox(
                  height: _minTouchTargetPx,
                  width: widget.maxWidth,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Chords only · tap to place',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ),
              ),
            ),
          )
        else
          LayoutBuilder(
            builder: (context, constraints) {
              final textScaler = MediaQuery.textScalerOf(context);
              final lyricHeight = _lyricHeight(lyricStyle, textScaler);
              final hitHeight =
                  lyricHeight < _minTouchTargetPx ? _minTouchTargetPx : lyricHeight;
              return SizedBox(
                  height: hitHeight,
                  width: widget.maxWidth,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Positioned.fill(
                        child: _SelectableLyricText(
                          lyrics: widget.line.lyrics,
                          style: lyricStyle,
                          charSlot: charSlot,
                          maxWidth: widget.maxWidth,
                          onPlaceSlot: widget.onPlaceSlot,
                        ),
                      ),
                    for (final zone in gapZones)
                      _GapZoneButton(
                        line: widget.line,
                        zone: zone,
                        offsets: _chordOffsets,
                        activeSlot: widget.activeSlot,
                        onPlaceSlot: widget.onPlaceSlot,
                        lyricHeight: hitHeight,
                      ),
                    if (caret != null && _chordOffsets[caret] != null)
                      Positioned(
                        left: _chordOffsets[caret]!,
                        top: 0,
                        bottom: 0,
                        child: _GapCaret(),
                      ),
                    ],
                  ),
                );
            },
          ),
      ],
    );
  }

  double _lyricHeight(TextStyle style, TextScaler textScaler) {
    final painter = TextPainter(
      text: TextSpan(text: widget.line.lyrics, style: style),
      textDirection: TextDirection.ltr,
      textScaler: textScaler,
    )..layout(maxWidth: widget.maxWidth);
    return painter.height;
  }
}

class _SelectableLyricText extends StatefulWidget {
  const _SelectableLyricText({
    required this.lyrics,
    required this.style,
    required this.charSlot,
    required this.maxWidth,
    required this.onPlaceSlot,
  });

  final String lyrics;
  final TextStyle style;
  final CharPlacementSlot? charSlot;
  final double maxWidth;
  final ValueChanged<PlacementSlot> onPlaceSlot;

  @override
  State<_SelectableLyricText> createState() => _SelectableLyricTextState();
}

class _SelectableLyricTextState extends State<_SelectableLyricText> {
  final _selectableKey = GlobalKey<State<StatefulWidget>>();
  Timer? _selectionDebounce;

  @override
  void dispose() {
    _selectionDebounce?.cancel();
    super.dispose();
  }

  TextSpan _buildSpan(BuildContext context) {
    final charSlot = widget.charSlot;
    if (charSlot == null ||
        charSlot.end <= charSlot.start ||
        charSlot.start >= widget.lyrics.length) {
      return TextSpan(text: widget.lyrics, style: widget.style);
    }

    final start = charSlot.start.clamp(0, widget.lyrics.length);
    final end = charSlot.end.clamp(start, widget.lyrics.length);
    final highlightColor = Theme.of(context).colorScheme.primaryContainer;

    return TextSpan(
      style: widget.style,
      children: [
        if (start > 0) TextSpan(text: widget.lyrics.substring(0, start)),
        TextSpan(
          text: widget.lyrics.substring(start, end),
          style: widget.style.copyWith(
            backgroundColor: highlightColor.withValues(alpha: 0.85),
          ),
        ),
        if (end < widget.lyrics.length)
          TextSpan(text: widget.lyrics.substring(end)),
      ],
    );
  }

  void _handleSelectionChanged(
    TextSelection selection,
    SelectionChangedCause? cause,
  ) {
    if (!selection.isValid) {
      return;
    }

    if (selection.isCollapsed) {
      if (cause == SelectionChangedCause.tap) {
        widget.onPlaceSlot(
          slotFromCaret(widget.lyrics, selection.start),
        );
      }
      return;
    }

    _selectionDebounce?.cancel();
    _selectionDebounce = Timer(const Duration(milliseconds: 150), () {
      if (!mounted) {
        return;
      }
      _notifySelection(selection);
    });
  }

  void _notifySelection(TextSelection selection) {
    if (!selection.isValid) {
      return;
    }

    final start = selection.start;
    final end = selection.end;
    if (end <= start) {
      return;
    }

    final selected = widget.lyrics.substring(
      start.clamp(0, widget.lyrics.length),
      end.clamp(0, widget.lyrics.length),
    );
    if (selected.trim().isEmpty) {
      widget.onPlaceSlot(PlacementSlot.gap(index: start));
      return;
    }

    final selectedLength = end - start;
    var rangeStart = start;
    var rangeEnd = end;
    if (selectedLength >= widget.lyrics.length * 0.6) {
      final collapsed = collapseSelectionToWord(
        widget.lyrics,
        start,
        end,
        selection.extentOffset,
      );
      rangeStart = collapsed.start;
      rangeEnd = collapsed.end;
    }

    if (rangeEnd <= rangeStart) {
      return;
    }

    widget.onPlaceSlot(
      slotFromSelection(widget.lyrics, rangeStart, rangeEnd),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SelectableText.rich(
      key: _selectableKey,
      _buildSpan(context),
      style: widget.style,
      onSelectionChanged: _handleSelectionChanged,
      contextMenuBuilder: (context, editableTextState) {
        return AdaptiveTextSelectionToolbar.buttonItems(
          anchors: editableTextState.contextMenuAnchors,
          buttonItems: const [],
        );
      },
    );
  }
}

class _GapZoneButton extends StatelessWidget {
  const _GapZoneButton({
    required this.line,
    required this.zone,
    required this.offsets,
    required this.activeSlot,
    required this.onPlaceSlot,
    required this.lyricHeight,
  });

  final LyricLine line;
  final GapZone zone;
  final Map<int, double> offsets;
  final PlacementSlot? activeSlot;
  final ValueChanged<PlacementSlot> onPlaceSlot;
  final double lyricHeight;

  @override
  Widget build(BuildContext context) {
    final left = offsets[zone.index];
    if (left == null) {
      return const SizedBox.shrink();
    }

    final right = offsets[zone.endIndex] ?? left;
    var zoneLeft = left;
    var zoneWidth = (right - left).clamp(0.0, double.infinity);

    if (zone.kind == GapZoneKind.lineStart) {
      zoneLeft = left - _lineStartZonePx + 2;
      zoneWidth = _lineStartZonePx;
    } else if (zone.kind == GapZoneKind.lineEnd) {
      zoneWidth = zoneWidth + _lineEndZonePx;
    }

    final gapSlot = PlacementSlot.gap(index: zone.index);
    final slot = activeSlot;
    final bool isActive;
    if (slot is GapPlacementSlot) {
      isActive = slot.index == zone.index;
    } else if (slot is CharPlacementSlot) {
      isActive = slot.start >= zone.index && slot.start < zone.endIndex;
    } else {
      isActive = false;
    }

    return Positioned(
      left: zoneLeft,
      width: zoneWidth < 4 ? 4 : zoneWidth,
      top: 0,
      height: lyricHeight,
      child: Semantics(
        button: true,
        label: describeSlot(line, gapSlot),
        child: Material(
          color: isActive
              ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.12)
              : Colors.transparent,
          child: InkWell(
            onTap: () => onPlaceSlot(gapSlot),
          ),
        ),
      ),
    );
  }
}

class _GapCaret extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 2,
      margin: const EdgeInsets.symmetric(vertical: 2),
      color: Theme.of(context).colorScheme.primary,
    );
  }
}
