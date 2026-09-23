import 'package:flutter/foundation.dart';

import 'package:flutter/material.dart';

import 'package:lf_chords/data/models/lyric_line.dart';

import 'package:lf_chords/data/models/song.dart';

import 'package:lf_chords/domain/chart_lyric_style.dart';

import 'package:lf_chords/domain/chord_pro_display.dart';

import 'package:lf_chords/domain/language_tags.dart';

import 'package:lf_chords/domain/lyric_chords.dart';

import 'package:lf_chords/domain/wrap_lyric_line.dart';

import 'package:lf_chords/features/song/layout/chord_label_measure.dart';

import 'package:lf_chords/features/song/widgets/chord_row.dart';
import 'package:lf_chords/features/song/widgets/chart_theme_scope.dart';

class ChordLineWidget extends StatefulWidget {
  const ChordLineWidget({
    super.key,

    required this.line,

    required this.originalKey,

    required this.targetKey,

    required this.viewMode,

    required this.wrapEnabled,

    required this.maxChars,

    required this.maxWidth,

    required this.fontSize,

    this.languageTags = const [],
  });

  final LyricLine line;

  final String originalKey;

  final String targetKey;

  final SongViewMode viewMode;

  final bool wrapEnabled;

  final int maxChars;

  final double maxWidth;

  final double fontSize;

  final List<String> languageTags;

  @override
  State<ChordLineWidget> createState() => _ChordLineWidgetState();
}

class _ChordLineWidgetState extends State<ChordLineWidget> {
  var _fontsReady = true;

  @override
  void initState() {
    super.initState();

    _prepareFonts();
  }

  @override
  void didUpdateWidget(ChordLineWidget oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.fontSize != widget.fontSize ||
        !listEquals(oldWidget.languageTags, widget.languageTags)) {
      _prepareFonts();
    }
  }

  Future<void> _prepareFonts() async {
    final lang = getLanguageTag(widget.languageTags);
    final needsAsyncFont =
        lang == 'lang:malayalam' ||
        lang == 'lang:hindi' ||
        lang == 'lang:marathi';
    if (!needsAsyncFont) {
      if (!_fontsReady && mounted) {
        setState(() => _fontsReady = true);
      }
      return;
    }
    if (_fontsReady) {
      setState(() => _fontsReady = false);
    }
    await ensureChartLyricFontsLoaded(widget.languageTags);
    if (mounted) {
      setState(() => _fontsReady = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final segments = widget.wrapEnabled
        ? wrapLyricLine(widget.line, widget.maxChars)
        : [
            WrappedSegment(
              lyrics: widget.line.lyrics,
              chords: widget.line.chords,
            ),
          ];

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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,

      children: [
        for (final segment in segments)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),

            child: _SegmentView(
              key: ValueKey('$_fontsReady-${segment.lyrics.hashCode}'),

              segment: segment,

              originalKey: widget.originalKey,

              targetKey: widget.targetKey,

              viewMode: widget.viewMode,

              lyricStyle: lyricStyle,

              chordStyle: chordStyle,

              maxWidth: widget.maxWidth,

              measureOffsets: _fontsReady,
            ),
          ),
      ],
    );
  }
}

class _SegmentView extends StatelessWidget {
  const _SegmentView({
    super.key,

    required this.segment,

    required this.originalKey,

    required this.targetKey,

    required this.viewMode,

    required this.lyricStyle,

    required this.chordStyle,

    required this.maxWidth,

    required this.measureOffsets,
  });

  final WrappedSegment segment;

  final String originalKey;

  final String targetKey;

  final SongViewMode viewMode;

  final TextStyle lyricStyle;

  final TextStyle chordStyle;

  final double maxWidth;

  final bool measureOffsets;

  @override
  Widget build(BuildContext context) {
    final packed = isChordOnlyLine(
      LyricLine(lyrics: segment.lyrics, chords: segment.chords),
    );

    final starts = lyricChordStarts(segment.chords);

    final offsets = !measureOffsets || packed
        ? null
        : measureChordOffsets(segment.lyrics, starts, lyricStyle, maxWidth);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,

      children: [
        if (segment.chords.isNotEmpty)
          ChordRowWidget(
            chords: segment.chords,

            originalKey: originalKey,

            targetKey: targetKey,

            viewMode: viewMode,

            chordStyle: chordStyle,

            chordOffsets: offsets,

            packed: packed,

            maxWidth: maxWidth,
          ),

        if (segment.lyrics.trim().isNotEmpty)
          Text(segment.lyrics, style: lyricStyle),
      ],
    );
  }
}

class SectionBlock extends StatelessWidget {
  const SectionBlock({
    super.key,

    required this.label,

    required this.lines,

    required this.originalKey,

    required this.targetKey,

    required this.viewMode,

    required this.wrapEnabled,

    required this.maxChars,

    required this.maxWidth,

    required this.fontSize,

    this.languageTags = const [],
  });

  final String label;

  final List<LyricLine> lines;

  final String originalKey;

  final String targetKey;

  final SongViewMode viewMode;

  final bool wrapEnabled;

  final int maxChars;

  final double maxWidth;

  final double fontSize;

  final List<String> languageTags;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          Text(
            label,

            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.1,
                  color: ChartThemeScope.of(context).sectionLabelColor,
                ),
          ),

          const SizedBox(height: 8),

          for (final line in lines)
            ChordLineWidget(
              line: line,

              originalKey: originalKey,

              targetKey: targetKey,

              viewMode: viewMode,

              wrapEnabled: wrapEnabled,

              maxChars: maxChars,

              maxWidth: maxWidth,

              fontSize: fontSize,

              languageTags: languageTags,
            ),
        ],
      ),
    );
  }
}
