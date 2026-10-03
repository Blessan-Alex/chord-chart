import 'package:lf_chords/domain/grapheme_utils.dart';

bool _isSpace(String char) => RegExp(r'\s').hasMatch(char);

/// Collapse an over-wide selection to a single word (grapheme-safe).
({int start, int end}) collapseSelectionToWord(
  String text,
  int start,
  int end, [
  int? preferredIndex,
]) {
  if (text.isEmpty || end <= start) {
    return (start: start, end: end);
  }

  final selectedLength = end - start;
  if (selectedLength < text.length * 0.6) {
    return snapRangeToGraphemes(text, start, end);
  }

  final anchor = preferredIndex != null
      ? preferredIndex.clamp(0, text.length - 1)
      : start.clamp(0, text.length - 1);
  var wordStart = anchor;
  var wordEnd = anchor + 1;

  while (wordStart > 0 && !_isSpace(text[wordStart - 1])) {
    wordStart -= 1;
  }
  while (wordEnd < text.length && !_isSpace(text[wordEnd])) {
    wordEnd += 1;
  }

  if (wordEnd <= wordStart) {
    return snapRangeToGraphemes(text, start, end);
  }

  return snapRangeToGraphemes(text, wordStart, wordEnd);
}
