import 'package:flutter/material.dart';
import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/data/models/song.dart';
import 'package:lf_chords/domain/chord_layout.dart';
import 'package:lf_chords/domain/chord_marks.dart';
import 'package:lf_chords/domain/chart_display.dart';
import 'package:lf_chords/features/song/layout/chord_label_measure.dart';

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
  });

  final List<ChordMark> chords;
  final String originalKey;
  final String targetKey;
  final SongViewMode viewMode;
  final TextStyle chordStyle;
  final Map<int, double>? chordOffsets;
  final bool packed;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    final sorted = [...chords.map(normalizeChordMark)]
      ..sort((a, b) => getMarkStart(a).compareTo(getMarkStart(b)));
    if (sorted.isEmpty) {
      return const SizedBox.shrink();
    }

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

    return SizedBox(
      height: minHeight,
      width: maxWidth,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          for (var i = 0; i < sorted.length; i++)
            Positioned(
              left: placements[i].left,
              bottom: placements[i].tier * tierStepPx,
              child: Text(labels[i], style: chordStyle),
            ),
        ],
      ),
    );
  }
}
