import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/domain/engine.dart';
import 'package:lf_chords/data/models/song.dart';

String safeTranspose(String chord, String from, String to) {
  try {
    return transposeChord(chord, from, to);
  } catch (_) {
    return chord;
  }
}

String safeDegree(String chord, String key) {
  try {
    return chordToDegree(chord, key);
  } catch (_) {
    return '?';
  }
}

/// Web [ChordRow.displayChord]: numbers use [originalKey], not transposed key.
String displayChordLabel(
  ChordMark mark,
  String originalKey,
  String targetKey,
  SongViewMode viewMode,
) {
  return viewMode == SongViewMode.chords
      ? safeTranspose(mark.chord, originalKey, targetKey)
      : safeDegree(mark.chord, originalKey);
}

const double packedChordGapPx = 12;
const double tierStepEm = 1.35;
const double chartBaseFontSize = 18;
const int performanceBreakpointPx = 768;

bool computeWrapEnabled({required double viewportWidth, required bool hasPlaylist}) {
  return viewportWidth < performanceBreakpointPx || hasPlaylist;
}
