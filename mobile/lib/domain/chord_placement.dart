import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/data/models/lyric_line.dart';
import 'package:lf_chords/domain/chord_marks.dart';
import 'package:lf_chords/domain/grapheme_utils.dart';

/// A placeable position on a lyric line (`char` on a grapheme, `gap` between).
sealed class PlacementSlot {
  const PlacementSlot();

  const factory PlacementSlot.char({required int start, required int end}) =
      CharPlacementSlot;

  const factory PlacementSlot.gap({required int index}) = GapPlacementSlot;

  int get slotPosition => switch (this) {
        CharPlacementSlot(:final start) => start,
        GapPlacementSlot(:final index) => index,
      };
}

final class CharPlacementSlot extends PlacementSlot {
  const CharPlacementSlot({required this.start, required this.end});

  final int start;
  final int end;

  @override
  bool operator ==(Object other) =>
      other is CharPlacementSlot && start == other.start && end == other.end;

  @override
  int get hashCode => Object.hash(start, end);
}

final class GapPlacementSlot extends PlacementSlot {
  const GapPlacementSlot({required this.index});

  final int index;

  @override
  bool operator ==(Object other) =>
      other is GapPlacementSlot && index == other.index;

  @override
  int get hashCode => index.hashCode;
}

enum GapZoneKind { lineStart, between, lineEnd }

class GapZone {
  const GapZone({
    required this.index,
    required this.endIndex,
    required this.kind,
  });

  final int index;
  final int endIndex;
  final GapZoneKind kind;

  @override
  bool operator ==(Object other) =>
      other is GapZone &&
      index == other.index &&
      endIndex == other.endIndex &&
      kind == other.kind;

  @override
  int get hashCode => Object.hash(index, endIndex, kind);
}

class PreparedGapPlacement {
  const PreparedGapPlacement({
    required this.line,
    required this.slot,
    required this.preparedSpacerAt,
    required this.preparedSpacerCount,
  });

  final LyricLine line;
  final PlacementSlot slot;
  final int? preparedSpacerAt;
  final int preparedSpacerCount;
}

class AppliedPlacement {
  const AppliedPlacement({required this.line, required this.slot});

  final LyricLine line;
  final PlacementSlot slot;
}

const _spacer = ' ';
const _maxQuickPicks = 8;
const _gapStackSpaces = 2;

int slotPosition(PlacementSlot slot) => slot.slotPosition;

bool _isSpace(String? char) {
  if (char == null) {
    return false;
  }
  return RegExp(r'\s').hasMatch(char);
}

bool _sameSlot(PlacementSlot? a, PlacementSlot? b) {
  if (a == null || b == null) {
    return false;
  }
  return a == b;
}

List<ChordMark> _sortedByStart(List<ChordMark> chords) {
  return [...chords]
    ..sort((a, b) => getMarkStart(a).compareTo(getMarkStart(b)));
}

Set<int> _occupiedStarts(List<ChordMark> chords) {
  return chords
      .map((mark) => getMarkStart(normalizeChordMark(mark)))
      .toSet();
}

({int start, int end})? _whitespaceRunAt(String lyrics, int index) {
  final len = lyrics.length;
  var probe = index;

  if (probe >= len || !_isSpace(lyrics[probe])) {
    if (probe > 0 && _isSpace(lyrics[probe - 1])) {
      probe -= 1;
    } else {
      return null;
    }
  }

  var start = probe;
  var end = probe + 1;
  while (start > 0 && _isSpace(lyrics[start - 1])) {
    start -= 1;
  }
  while (end < len && _isSpace(lyrics[end])) {
    end += 1;
  }

  return (start: start, end: end);
}

PlacementSlot slotFromCaret(String lyrics, int offset) {
  final len = lyrics.length;
  final clamped = offset.clamp(0, len);

  if (len == 0) {
    return const PlacementSlot.gap(index: 0);
  }

  if (clamped >= len) {
    return PlacementSlot.gap(index: len);
  }

  if (_isSpace(lyrics[clamped])) {
    return PlacementSlot.gap(index: clamped);
  }

  final range = graphemeRangeAt(lyrics, clamped);
  return PlacementSlot.char(start: range.start, end: range.end);
}

PlacementSlot slotFromSelection(String lyrics, int start, int end) {
  if (end <= start) {
    return slotFromCaret(lyrics, start);
  }

  final selected = lyrics.substring(start, end);
  if (selected.trim().isEmpty) {
    return PlacementSlot.gap(index: start);
  }

  return PlacementSlot.char(start: start, end: end);
}

List<PlacementSlot> slotsForLine(LyricLine line) {
  final lyrics = line.lyrics;
  final len = lyrics.length;
  final slots = <PlacementSlot>[];

  if (len == 0) {
    return [const PlacementSlot.gap(index: 0)];
  }

  if (!_isSpace(lyrics[0])) {
    slots.add(const PlacementSlot.gap(index: 0));
  }

  final boundaries = graphemeBoundaries(lyrics, 'en');
  var cursor = 0;

  while (cursor < len) {
    if (_isSpace(lyrics[cursor])) {
      final run = _whitespaceRunAt(lyrics, cursor);
      final runEnd = run?.end ?? cursor + 1;
      slots.add(PlacementSlot.gap(index: cursor));
      cursor = runEnd;
      continue;
    }

    final nextBoundary =
        boundaries.firstWhere((b) => b > cursor, orElse: () => cursor + 1);
    slots.add(PlacementSlot.char(start: cursor, end: nextBoundary));
    cursor = nextBoundary;
  }

  if (!_isSpace(lyrics[len - 1])) {
    slots.add(PlacementSlot.gap(index: len));
  }

  return slots;
}

List<GapZone> gapZonesForLine(LyricLine line) {
  final lyrics = line.lyrics;
  final len = lyrics.length;

  return slotsForLine(line)
      .whereType<GapPlacementSlot>()
      .map((slot) {
        final run =
            slot.index < len ? _whitespaceRunAt(lyrics, slot.index) : null;
        final endIndex = run?.end ?? slot.index;
        final GapZoneKind kind;
        if (slot.index == 0 && run == null) {
          kind = GapZoneKind.lineStart;
        } else if (endIndex >= len) {
          kind = GapZoneKind.lineEnd;
        } else {
          kind = GapZoneKind.between;
        }

        return GapZone(index: slot.index, endIndex: endIndex, kind: kind);
      })
      .toList();
}

List<int> gapMeasurementIndices(LyricLine line) {
  final indices = <int>{};
  for (final zone in gapZonesForLine(line)) {
    indices.add(zone.index);
    indices.add(zone.endIndex);
  }
  return indices.toList();
}

List<ChordMark> _shiftMarksForInsert(List<ChordMark> chords, int at) {
  return chords.map((mark) {
    final normalized = normalizeChordMark(mark);
    final start = getMarkStart(normalized);
    final end = getMarkEnd(normalized);

    return normalizeChordMark(
      ChordMark(
        chord: normalized.chord,
        start: start >= at ? start + 1 : start,
        end: end > at ? end + 1 : end,
      ),
    );
  }).toList();
}

List<ChordMark> _shiftMarksForDelete(List<ChordMark> chords, int at) {
  return chords.map((mark) {
    final normalized = normalizeChordMark(mark);
    final start = getMarkStart(normalized);
    final end = getMarkEnd(normalized);

    return normalizeChordMark(
      ChordMark(
        chord: normalized.chord,
        start: start > at ? start - 1 : start,
        end: end > at ? end - 1 : end,
      ),
    );
  }).toList();
}

LyricLine _insertSpacer(LyricLine line, int at) {
  final clamped = at.clamp(0, line.lyrics.length);
  return LyricLine(
    lyrics:
        '${line.lyrics.substring(0, clamped)}$_spacer${line.lyrics.substring(clamped)}',
    chords: _shiftMarksForInsert(line.chords, clamped),
  );
}

LyricLine _insertSpacers(LyricLine line, int at, int count) {
  var current = line;
  for (var i = 0; i < count; i++) {
    current = _insertSpacer(current, at);
  }
  return current;
}

({int anchorIndex, int? insertAt}) _resolveGapAnchor(LyricLine line, int index) {
  final clamped = index.clamp(0, line.lyrics.length);
  final run = _whitespaceRunAt(line.lyrics, clamped);

  if (run == null) {
    return (anchorIndex: clamped, insertAt: clamped);
  }

  final occupied = _occupiedStarts(line.chords);
  for (var i = run.start; i < run.end; i++) {
    if (!occupied.contains(i)) {
      return (anchorIndex: i, insertAt: null);
    }
  }

  return (anchorIndex: run.end, insertAt: run.end);
}

int _spacersToInsert(LyricLine line, int insertAt) {
  final run = _whitespaceRunAt(line.lyrics, insertAt);
  if (run == null) {
    return 1;
  }
  return _gapStackSpaces;
}

int gapPreviewAnchor(LyricLine line, int gapIndex) {
  return _resolveGapAnchor(line, gapIndex).anchorIndex;
}

PreparedGapPlacement prepareGapPlacement(LyricLine line, int gapIndex) {
  final resolved = _resolveGapAnchor(line, gapIndex);
  final anchorIndex = resolved.anchorIndex;
  final insertAt = resolved.insertAt;

  if (insertAt != null) {
    final count = _spacersToInsert(line, insertAt);
    final nextLine = _insertSpacers(line, insertAt, count);
    return PreparedGapPlacement(
      line: nextLine,
      slot: PlacementSlot.char(start: anchorIndex, end: anchorIndex + 1),
      preparedSpacerAt: anchorIndex,
      preparedSpacerCount: count,
    );
  }

  return PreparedGapPlacement(
    line: line,
    slot: PlacementSlot.char(start: anchorIndex, end: anchorIndex + 1),
    preparedSpacerAt: null,
    preparedSpacerCount: 0,
  );
}

LyricLine rewindPreparedGapSpacer(
  LyricLine line,
  int spacerIndex, [
  int count = 1,
]) {
  var current = line;
  for (var n = 0; n < count; n++) {
    if (spacerIndex < 0 || spacerIndex >= current.lyrics.length) {
      break;
    }
    if (!isRemovableSpacer(current.lyrics, spacerIndex)) {
      break;
    }
    if (_occupiedStarts(current.chords).contains(spacerIndex)) {
      break;
    }

    current = LyricLine(
      lyrics:
          '${current.lyrics.substring(0, spacerIndex)}${current.lyrics.substring(spacerIndex + 1)}',
      chords: _shiftMarksForDelete(current.chords, spacerIndex),
    );
  }
  return current;
}

AppliedPlacement applyPlacement(
  LyricLine line,
  PlacementSlot slot,
  String chord,
) {
  if (slot is CharPlacementSlot) {
    final chords = line.chords.map(normalizeChordMark).toList();
    final existingIdx =
        chords.indexWhere((mark) => getMarkStart(mark) == slot.start);
    final mark = createChordMark(chord, slot.start, slot.end);

    if (existingIdx >= 0) {
      chords[existingIdx] = mark;
    } else {
      chords.add(mark);
    }

    return AppliedPlacement(
      line: LyricLine(lyrics: line.lyrics, chords: _sortedByStart(chords)),
      slot: slot,
    );
  }

  final gapSlot = slot as GapPlacementSlot;
  final resolved = _resolveGapAnchor(line, gapSlot.index);
  final anchorIndex = resolved.anchorIndex;
  final insertAt = resolved.insertAt;

  final base = insertAt == null
      ? line
      : _insertSpacers(line, insertAt, _spacersToInsert(line, insertAt));
  final chords = base.chords.map(normalizeChordMark).toList();
  final existingIdx =
      chords.indexWhere((mark) => getMarkStart(mark) == anchorIndex);
  final mark = createChordMark(chord, anchorIndex, anchorIndex + 1);

  if (existingIdx >= 0) {
    chords[existingIdx] = mark;
  } else {
    chords.add(mark);
  }

  return AppliedPlacement(
    line: LyricLine(lyrics: base.lyrics, chords: _sortedByStart(chords)),
    slot: PlacementSlot.char(start: anchorIndex, end: anchorIndex + 1),
  );
}

bool isRemovableSpacer(String lyrics, int index) {
  if (index < 0 || index >= lyrics.length || !_isSpace(lyrics[index])) {
    return false;
  }

  final atLineStart = index == 0;
  final atLineEnd = index == lyrics.length - 1;
  return atLineStart ||
      atLineEnd ||
      _isSpace(lyrics[index - 1]) ||
      _isSpace(lyrics[index + 1]);
}

LyricLine removePlacementAt(LyricLine line, int start) {
  final kept = line.chords
      .map(normalizeChordMark)
      .where((mark) => getMarkStart(mark) != start)
      .toList();

  if (kept.length == line.chords.length) {
    return LyricLine(lyrics: line.lyrics, chords: kept);
  }

  if (!isRemovableSpacer(line.lyrics, start)) {
    return LyricLine(lyrics: line.lyrics, chords: kept);
  }

  final stillOccupied = kept.any((mark) => getMarkStart(mark) == start);
  if (stillOccupied) {
    return LyricLine(lyrics: line.lyrics, chords: kept);
  }

  return LyricLine(
    lyrics:
        '${line.lyrics.substring(0, start)}${line.lyrics.substring(start + 1)}',
    chords: _shiftMarksForDelete(kept, start),
  );
}

ChordMark? findChordAtSlot(LyricLine line, PlacementSlot slot) {
  if (slot is! CharPlacementSlot) {
    return null;
  }
  for (final mark in line.chords.map(normalizeChordMark)) {
    if (getMarkStart(mark) == slot.start) {
      return mark;
    }
  }
  return null;
}

int _slotIndexIn(List<PlacementSlot> slots, PlacementSlot slot) {
  final exact = slots.indexWhere((candidate) => _sameSlot(candidate, slot));
  if (exact >= 0) {
    return exact;
  }

  final position = slotPosition(slot);
  final nearest =
      slots.indexWhere((candidate) => slotPosition(candidate) >= position);
  return nearest >= 0 ? nearest : slots.length - 1;
}

PlacementSlot _stepSlot(LyricLine line, PlacementSlot slot, int direction) {
  final slots = slotsForLine(line);
  final current = _slotIndexIn(slots, slot);
  final next = current + direction;

  if (next < 0 || next >= slots.length) {
    return slots[current];
  }

  return slots[next];
}

PlacementSlot nextSlot(LyricLine line, PlacementSlot slot) {
  return _stepSlot(line, slot, 1);
}

PlacementSlot prevSlot(LyricLine line, PlacementSlot slot) {
  return _stepSlot(line, slot, -1);
}

String _wordBefore(String lyrics, int index) {
  var end = index;
  while (end > 0 && _isSpace(lyrics[end - 1])) {
    end -= 1;
  }
  var start = end;
  while (start > 0 && !_isSpace(lyrics[start - 1])) {
    start -= 1;
  }
  return lyrics.substring(start, end);
}

String _wordAfter(String lyrics, int index) {
  var start = index;
  while (start < lyrics.length && _isSpace(lyrics[start])) {
    start += 1;
  }
  var end = start;
  while (end < lyrics.length && !_isSpace(lyrics[end])) {
    end += 1;
  }
  return lyrics.substring(start, end);
}

String _wordAt(String lyrics, int index) {
  var start = index;
  var end = index;
  while (start > 0 && !_isSpace(lyrics[start - 1])) {
    start -= 1;
  }
  while (end < lyrics.length && !_isSpace(lyrics[end])) {
    end += 1;
  }
  return lyrics.substring(start, end);
}

const _openQuote = '\u201C';
const _closeQuote = '\u201D';

String describeSlot(LyricLine line, PlacementSlot slot) {
  final lyrics = line.lyrics;

  if (lyrics.trim().isEmpty) {
    return 'Chords only · empty line';
  }

  if (slot is CharPlacementSlot) {
    final text = lyrics.substring(slot.start, slot.end);
    if (text.trim().isEmpty) {
      final before = _wordBefore(lyrics, slot.start);
      return before.isNotEmpty
          ? 'Gap · after $_openQuote$before$_closeQuote'
          : 'Gap · start of line';
    }
    return 'On $_openQuote$text$_closeQuote in $_openQuote${_wordAt(lyrics, slot.start)}$_closeQuote';
  }

  final gapSlot = slot as GapPlacementSlot;
  final atLineEnd = gapSlot.index >= lyrics.trimRight().length;
  final before = _wordBefore(lyrics, gapSlot.index);
  final after = _wordAfter(lyrics, gapSlot.index);

  if (before.isEmpty) {
    return after.isNotEmpty
        ? 'Gap · before $_openQuote$after$_closeQuote'
        : 'Gap · start of line';
  }
  if (atLineEnd || after.isEmpty) {
    return 'End of line · after $_openQuote$before$_closeQuote';
  }
  return 'Gap · between $_openQuote$before$_closeQuote and $_openQuote$after$_closeQuote';
}

List<String> chordsUsedIn(List<LyricLine> lines) {
  final seen = <String, int>{};

  for (final line in lines) {
    for (final mark in line.chords) {
      final chord = normalizeChordMark(mark).chord.trim();
      if (chord.isNotEmpty) {
        seen[chord] = (seen[chord] ?? 0) + 1;
      }
    }
  }

  final entries = seen.entries.toList()
    ..sort((a, b) => b.value.compareTo(a.value));
  return entries.take(_maxQuickPicks).map((e) => e.key).toList();
}
