import 'package:flutter/material.dart';
import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/data/models/song.dart';
import 'package:lf_chords/domain/chord_layout.dart';
import 'package:lf_chords/domain/chord_marks.dart';
import 'package:lf_chords/domain/chart_display.dart';
import 'package:lf_chords/features/song/layout/chord_label_measure.dart';

class ChordRowGhost {
  const ChordRowGhost({required this.left, required this.label});

  final double left;
  final String label;
}

class ChordRowWidget extends StatelessWidget {
  const ChordRowWidget({
    super.key,
    required this.chords,
    required this.originalKey,
    required this.targetKey,
    required this.viewMode,
    required this.chordStyle,
    this.chordOffsets,
    this.packed = false,
    this.maxWidth = double.infinity,
    this.previewMark,
    this.ghost,
    this.onChordTap,
  });

  final List<ChordMark> chords;
  final String originalKey;
  final String targetKey;
  final SongViewMode viewMode;
  final TextStyle chordStyle;
  final Map<int, double>? chordOffsets;
  final bool packed;
  final double maxWidth;
  final ChordMark? previewMark;
  final ChordRowGhost? ghost;
  final ValueChanged<ChordMark>? onChordTap;

  @override
  Widget build(BuildContext context) {
    final normalized = chords.map(normalizeChordMark).toList();
    final preview = previewMark != null && previewMark!.chord.trim().isNotEmpty
        ? normalizeChordMark(previewMark!)
        : null;
    var merged = normalized;
    if (preview != null) {
      merged = [
        ...normalized.where((m) => getMarkStart(m) != getMarkStart(preview)),
        preview,
      ];
    }

    final sorted = [...merged]
      ..sort((a, b) => getMarkStart(a).compareTo(getMarkStart(b)));
    if (sorted.isEmpty && ghost == null) {
      return const SizedBox.shrink();
    }

    final previewStart = preview != null ? getMarkStart(preview) : null;
    final starts = sorted.map(getMarkStart).toList();
    final labels = sorted
        .map((m) => displayChordLabel(m, originalKey, targetKey, viewMode))
        .toList();
    final widths = measureChordLabelWidths(labels, chordStyle);

    Map<int, double> effectiveOffsets;
    if (packed) {
      effectiveOffsets = {};
      var left = 0.0;
      for (var i = 0; i < starts.length; i++) {
        effectiveOffsets[starts[i]] = left;
        left += widths[i] + packedChordGapPx;
      }
    } else {
      effectiveOffsets = chordOffsets ?? {};
    }

    final anchorLeft =
        starts.map((s) => effectiveOffsets[s] ?? 0.0).toList();
    final placements = resolveChordLayout(
      ResolveChordLayoutInput(
        starts: starts,
        anchorLeft: anchorLeft,
        width: widths,
      ),
    );
    final tierCount = maxTierUsed(placements) + 1;
    final emPx = chordStyle.fontSize ?? chartBaseFontSize;
    final tierStepPx = tierStepEm * emPx;
    final minHeight = tierCount * tierStepPx;

    final ghostMinHeight = ghost != null && sorted.isEmpty ? tierStepPx : 0.0;

    return SizedBox(
      height: minHeight > ghostMinHeight ? minHeight : ghostMinHeight,
      width: maxWidth,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          for (var i = 0; i < sorted.length; i++)
            Positioned(
              left: placements[i].left,
              bottom: placements[i].tier * tierStepPx,
              child: GestureDetector(
                onTap: onChordTap != null ? () => onChordTap!(sorted[i]) : null,
                child: Text(
                  labels[i],
                  style: chordStyle.copyWith(
                    color: previewStart == starts[i]
                        ? chordStyle.color?.withValues(alpha: 0.7)
                        : chordStyle.color,
                  ),
                ),
              ),
            ),
          if (ghost != null)
            Positioned(
              left: ghost!.left,
              bottom: 0,
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: (chordStyle.color ?? Colors.grey)
                            .withValues(alpha: 0.55),
                        style: BorderStyle.solid,
                        width: 1,
                      ),
                    ),
                  ),
                  child: Text(
                    ghost!.label,
                    style: chordStyle.copyWith(
                      color: (chordStyle.color ?? Colors.grey)
                          .withValues(alpha: 0.45),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
