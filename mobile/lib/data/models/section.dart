import 'package:lf_chords/data/models/lyric_line.dart';

class Section {
  const Section({
    required this.label,
    this.lines = const [],
  });

  final String label;
  final List<LyricLine> lines;

  factory Section.fromMap(Map<String, dynamic> map) {
    final rawLines = map['lines'];
    return Section(
      label: map['label'] as String? ?? '',
      lines: rawLines is List
          ? rawLines
              .whereType<Map>()
              .map((e) => LyricLine.fromMap(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }
}
