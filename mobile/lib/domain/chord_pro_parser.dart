import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/data/models/lyric_line.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/chord_marks.dart';
import 'package:lf_chords/domain/section_headers.dart';

LyricLine parseChordProLine(String input) {
  final chords = <ChordMark>[];
  var lyrics = '';
  var i = 0;

  while (i < input.length) {
    if (input[i] == '[') {
      final end = input.indexOf(']', i);
      if (end != -1) {
        final atEndOfInput = end + 1 >= input.length;
        var start = lyrics.length;
        var markEnd = lyrics.length + 1;
        if (atEndOfInput && start > 0 && lyrics.trim().isNotEmpty) {
          start = lyrics.length - 1;
          markEnd = lyrics.length;
        }
        chords.add(
          ChordMark(
            chord: input.substring(i + 1, end),
            start: start,
            end: markEnd,
          ),
        );
        i = end + 1;
        if (i < input.length && input[i] == '[') {
          lyrics += ' ';
        }
        continue;
      }
    }
    lyrics += input[i];
    i += 1;
  }

  return LyricLine(lyrics: lyrics, chords: chords);
}

List<Section> parseChordProSections(String rawText) {
  final lines = rawText.split(RegExp(r'\r?\n'));
  final built = <({String label, List<LyricLine> lines})>[];
  var defaultSectionCounter = 1;

  for (var raw in lines) {
    final line = raw.trim();
    if (line.isEmpty) {
      continue;
    }

    if (isSectionHeaderLine(line)) {
      final label = parseSectionHeaderLabel(line) ?? line;
      built.add((label: label, lines: []));
      continue;
    }

    if (built.isEmpty) {
      built.add((
        label: 'Section ${defaultSectionCounter++}',
        lines: [],
      ));
    }
    built.last.lines.add(parseChordProLine(line));
  }

  if (built.isEmpty) {
    return [const Section(label: 'Verse 1', lines: [])];
  }

  return built
      .map((b) => Section(label: b.label, lines: List<LyricLine>.from(b.lines)))
      .toList();
}

bool _isTrailingChordMark(ChordMark mark, int lyricLength) {
  if (lyricLength <= 0) {
    return false;
  }
  final start = getMarkStart(mark);
  final end = getMarkEnd(mark);
  return start == lyricLength - 1 && end == lyricLength;
}

String serializeChordProLine(LyricLine line) {
  final chords = [...line.chords.map(normalizeChordMark)]
    ..sort((a, b) => getMarkStart(a).compareTo(getMarkStart(b)));

  if (chords.isEmpty) {
    return line.lyrics;
  }

  final lyrics = line.lyrics;
  final buffer = StringBuffer();
  var cursor = 0;

  for (final mark in chords) {
    if (_isTrailingChordMark(mark, lyrics.length)) {
      buffer.write(lyrics.substring(cursor));
      buffer.write('[${mark.chord}]');
      cursor = lyrics.length;
      continue;
    }
    final start = getMarkStart(mark);
    buffer.write(lyrics.substring(cursor, start.clamp(0, lyrics.length)));
    buffer.write('[${mark.chord}]');
    cursor = start;
  }
  buffer.write(lyrics.substring(cursor.clamp(0, lyrics.length)));
  return buffer.toString();
}

String sectionsToChordProText(List<Section> sections) {
  return sections.map((section) {
    final header = '{${section.label}}';
    final body = section.lines.map(serializeChordProLine).join('\n');
    return body.isNotEmpty ? '$header\n$body' : header;
  }).join('\n\n');
}

int countChordsInSections(List<Section> sections) {
  var total = 0;
  for (final section in sections) {
    for (final line in section.lines) {
      total += line.chords.length;
    }
  }
  return total;
}
