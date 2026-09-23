class ChordMark {
  const ChordMark({
    required this.chord,
    this.start,
    this.end,
    this.position,
  });

  final String chord;
  final int? start;
  final int? end;
  final int? position;

  factory ChordMark.fromMap(Map<String, dynamic> map) {
    return ChordMark(
      chord: map['chord'] as String? ?? '',
      start: (map['start'] as num?)?.toInt(),
      end: (map['end'] as num?)?.toInt(),
      position: (map['position'] as num?)?.toInt(),
    );
  }
}
