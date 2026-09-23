import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/data/models/lyric_line.dart';
import 'package:lf_chords/domain/chord_marks.dart';

class WrappedSegment {
  const WrappedSegment({required this.lyrics, required this.chords});

  final String lyrics;
  final List<ChordMark> chords;
}

const double monoCharWidthRatio = 0.602;

int charsPerLine(double containerWidth, double fontSize) {
  if (containerWidth <= 0 || fontSize <= 0) {
    return 32;
  }
  return (containerWidth / (fontSize * monoCharWidthRatio))
      .floor()
      .clamp(12, 999999);
}

List<ChordMark> _chordsForSegment(
  List<ChordMark> chords,
  int segStart,
  int segEnd,
) {
  return chords
      .where((chord) {
        final start = getMarkStart(chord);
        return start >= segStart && start < segEnd;
      })
      .map(
        (chord) => normalizeChordMark(
          ChordMark(
            chord: chord.chord,
            start: getMarkStart(chord) - segStart,
            end: getMarkStart(chord) - segStart + 1,
          ),
        ),
      )
      .toList();
}

List<WrappedSegment> wrapLyricLine(LyricLine line, int maxChars) {
  final text = line.lyrics;
  final normalizedChords = line.chords.map(normalizeChordMark).toList();

  if (maxChars <= 0 || text.length <= maxChars) {
    return [
      WrappedSegment(lyrics: text, chords: normalizedChords),
    ];
  }

  final segments = <WrappedSegment>[];
  var offset = 0;

  while (offset < text.length) {
    final remaining = text.length - offset;
    if (remaining <= maxChars) {
      segments.add(
        WrappedSegment(
          lyrics: text.substring(offset),
          chords: _chordsForSegment(normalizedChords, offset, text.length),
        ),
      );
      break;
    }

    var chunkLen = maxChars;
    var chunk = text.substring(offset, offset + chunkLen);

    if (offset + chunkLen < text.length &&
        !RegExp(r'\s').hasMatch(text[offset + chunkLen])) {
      final lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > 0) {
        chunkLen = lastSpace;
        chunk = text.substring(offset, offset + chunkLen);
      }
    }

    segments.add(
      WrappedSegment(
        lyrics: chunk,
        chords: _chordsForSegment(normalizedChords, offset, offset + chunkLen),
      ),
    );

    offset += chunkLen;
    while (offset < text.length && text[offset] == ' ') {
      offset += 1;
    }
  }

  return segments.isNotEmpty
      ? segments
      : [WrappedSegment(lyrics: text, chords: normalizedChords)];
}
