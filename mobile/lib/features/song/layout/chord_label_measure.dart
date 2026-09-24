import 'package:flutter/material.dart';

const String chordLabelFallbackFontFamily = 'monospace';

List<double> measureChordLabelWidths(
  List<String> labels,
  TextStyle style,
) {
  return labels.map((label) {
    final painter = TextPainter(
      text: TextSpan(text: label, style: style),
      textDirection: TextDirection.ltr,
    )..layout();
    return painter.width;
  }).toList();
}

double? measureLyricCharOffset(
  String lyrics,
  int charIndex,
  TextStyle style,
  double maxWidth,
) {
  if (charIndex < 0 || charIndex > lyrics.length) {
    return null;
  }
  final painter = TextPainter(
    text: TextSpan(text: lyrics, style: style),
    textDirection: TextDirection.ltr,
  )..layout(maxWidth: maxWidth);

  final boxes = painter.getBoxesForSelection(
    TextSelection(baseOffset: charIndex, extentOffset: charIndex + 1),
  );
  if (boxes.isEmpty) {
    return painter.getOffsetForCaret(
      TextPosition(offset: charIndex.clamp(0, lyrics.length)),
      Rect.zero,
    ).dx;
  }
  return boxes.first.left;
}

Map<int, double> measureChordOffsets(
  String lyrics,
  List<int> indices,
  TextStyle style,
  double maxWidth,
) {
  if (indices.isEmpty) {
    return {};
  }
  final cacheKey = Object.hash(
    lyrics,
    Object.hashAll(indices),
    style.fontSize,
    style.fontFamily,
    style.fontWeight,
    style.letterSpacing,
    maxWidth,
  );
  final cached = _chordOffsetCache[cacheKey];
  if (cached != null) {
    return Map<int, double>.from(cached);
  }

  final offsets = <int, double>{};
  for (final index in indices) {
    final measured = measureLyricCharOffset(lyrics, index, style, maxWidth);
    if (measured != null) {
      offsets[index] = measured;
    }
  }
  if (_chordOffsetCache.length >= _chordOffsetCacheMaxEntries) {
    _chordOffsetCache.clear();
  }
  _chordOffsetCache[cacheKey] = Map<int, double>.from(offsets);
  return offsets;
}

const int _chordOffsetCacheMaxEntries = 512;
final Map<int, Map<int, double>> _chordOffsetCache = {};
