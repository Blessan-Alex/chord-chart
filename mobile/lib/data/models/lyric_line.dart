import 'package:lf_chords/data/models/chord_mark.dart';

class LyricLine {
  const LyricLine({
    required this.lyrics,
    this.chords = const [],
  });

  final String lyrics;
  final List<ChordMark> chords;

  factory LyricLine.fromMap(Map<String, dynamic> map) {
    final rawChords = map['chords'];
    return LyricLine(
      lyrics: map['lyrics'] as String? ?? '',
      chords: rawChords is List
          ? rawChords
              .whereType<Map>()
              .map((e) => ChordMark.fromMap(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }
}
