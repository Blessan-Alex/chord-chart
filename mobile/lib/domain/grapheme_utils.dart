import 'package:characters/characters.dart';

List<String> splitGraphemes(String text, [String locale = 'en']) {
  return text.characters.toList();
}

List<int> graphemeBoundaries(String text, [String locale = 'en']) {
  final boundaries = <int>[0];
  var offset = 0;
  for (final cluster in text.characters) {
    offset += cluster.length;
    boundaries.add(offset);
  }
  return boundaries;
}

int _nearestBoundary(List<int> boundaries, int index, String mode) {
  if (boundaries.isEmpty) {
    return 0;
  }
  if (mode == 'floor') {
    var result = 0;
    for (final boundary in boundaries) {
      if (boundary > index) {
        break;
      }
      result = boundary;
    }
    return result;
  }
  for (final boundary in boundaries) {
    if (boundary >= index) {
      return boundary;
    }
  }
  return boundaries.last;
}

({int start, int end}) snapRangeToGraphemes(
  String text,
  int start,
  int end, [
  String locale = 'en',
]) {
  if (text.isEmpty || end <= start) {
    return (start: start, end: end);
  }
  final boundaries = graphemeBoundaries(text, locale);
  final safeStart = start.clamp(0, text.length);
  final safeEnd = end.clamp(safeStart, text.length);
  final snappedStart = _nearestBoundary(boundaries, safeStart, 'floor');
  final snappedEnd = _nearestBoundary(boundaries, safeEnd, 'ceil');
  if (snappedEnd <= snappedStart) {
    for (final boundary in boundaries) {
      if (boundary > snappedStart) {
        return (start: snappedStart, end: boundary.clamp(0, text.length));
      }
    }
    return (
      start: snappedStart,
      end: (snappedStart + 1).clamp(0, text.length),
    );
  }
  return (start: snappedStart, end: snappedEnd);
}

/// Grapheme cluster containing [index], or empty range at end of text.
({int start, int end}) graphemeRangeAt(
  String text,
  int index, [
  String locale = 'en',
]) {
  if (text.isEmpty) {
    return (start: 0, end: 0);
  }

  final clamped = index.clamp(0, text.length);
  final boundaries = graphemeBoundaries(text, locale);
  final start = _nearestBoundary(boundaries, clamped, 'floor');
  final end = _nearestBoundary(boundaries, clamped + 1, 'ceil');

  if (end <= start) {
    return (start: clamped, end: (clamped + 1).clamp(0, text.length));
  }

  return (start: start, end: end);
}
