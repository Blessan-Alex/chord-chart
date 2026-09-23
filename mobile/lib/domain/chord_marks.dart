import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/data/models/lyric_line.dart';
import 'package:lf_chords/data/models/section.dart';

int getMarkStart(ChordMark mark) {
  if (mark.start != null) {
    return mark.start!;
  }
  return mark.position ?? 0;
}

int getMarkEnd(ChordMark mark) {
  if (mark.end != null) {
    return mark.end!;
  }
  final start = getMarkStart(mark);
  return start + 1;
}

ChordMark normalizeChordMark(ChordMark mark) {
  final start = getMarkStart(mark);
  final end = start + 1 > getMarkEnd(mark) ? start + 1 : getMarkEnd(mark);
  return ChordMark(
    chord: mark.chord,
    start: start,
    end: end,
  );
}

ChordMark clampChordMarkToLyrics(ChordMark mark, int lyricLength) {
  final normalized = normalizeChordMark(mark);

  if (lyricLength <= 0) {
    return ChordMark(chord: normalized.chord, start: 0, end: 1);
  }

  var start = normalized.start!;
  var end = normalized.end!;

  if (end > lyricLength) {
    if (start >= lyricLength) {
      start = lyricLength - 1;
      end = lyricLength;
    } else {
      end = lyricLength;
    }
  }

  if (start > lyricLength) {
    start = lyricLength > 0 ? lyricLength - 1 : 0;
  }

  if (start >= end) {
    end = (start + 1).clamp(0, lyricLength);
  }

  return normalizeChordMark(
    ChordMark(chord: normalized.chord, start: start, end: end),
  );
}

LyricLine normalizeLyricLine(LyricLine line) {
  final lyricLength = line.lyrics.length;
  return LyricLine(
    lyrics: line.lyrics,
    chords: line.chords
        .map((m) => clampChordMarkToLyrics(normalizeChordMark(m), lyricLength))
        .toList(),
  );
}

List<Section> normalizeSections(List<Section> sections) {
  return sections
      .map(
        (section) => Section(
          label: section.label,
          lines: section.lines.map(normalizeLyricLine).toList(),
        ),
      )
      .toList();
}

String markKey(ChordMark mark) {
  final normalized = normalizeChordMark(mark);
  return '${normalized.start}:${normalized.end}:${normalized.chord}';
}
