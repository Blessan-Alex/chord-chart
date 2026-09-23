import 'package:lf_chords/data/models/lyric_line.dart';

bool isChordOnlyLine(LyricLine line) {
  return line.chords.isNotEmpty && line.lyrics.trim().isEmpty;
}
