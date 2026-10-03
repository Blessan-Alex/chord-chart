import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/data/models/lyric_line.dart';
import 'package:lf_chords/domain/chord_marks.dart';
import 'package:lf_chords/domain/chord_placement.dart';
import 'package:lf_chords/domain/chord_pro_parser.dart';

LyricLine _line(String lyrics, [List<ChordMark> chords = const []]) {
  return LyricLine(lyrics: lyrics, chords: chords);
}

PlacementSlot _gap(int index) => PlacementSlot.gap(index: index);

LyricLine _placeAll(
  LyricLine start,
  List<({PlacementSlot slot, String chord})> placements,
) {
  var current = start;
  for (final p in placements) {
    current = applyPlacement(current, p.slot, p.chord).line;
  }
  return current;
}

void _expectMark(ChordMark mark, String chord, int start, int end) {
  final n = normalizeChordMark(mark);
  expect(n.chord, chord);
  expect(n.start, start);
  expect(n.end, end);
}

void _expectLine(LyricLine actual, LyricLine expected) {
  expect(actual.lyrics, expected.lyrics);
  expect(actual.chords.length, expected.chords.length);
  for (var i = 0; i < expected.chords.length; i++) {
    final a = normalizeChordMark(actual.chords[i]);
    final e = normalizeChordMark(expected.chords[i]);
    expect(a.chord, e.chord);
    expect(a.start, e.start);
    expect(a.end, e.end);
  }
}

void main() {
  group('slotFromCaret', () {
    test('resolves a caret on a letter to that grapheme', () {
      expect(
        slotFromCaret('little star', 4),
        const PlacementSlot.char(start: 4, end: 5),
      );
    });

    test('resolves a caret on a space to a gap', () {
      expect(slotFromCaret('little star', 6), _gap(6));
    });

    test('resolves a caret past the last character to the end-of-line gap', () {
      expect(slotFromCaret('star', 4), _gap(4));
      expect(slotFromCaret('star', 99), _gap(4));
    });

    test('treats an empty line as a single gap', () {
      expect(slotFromCaret('', 0), _gap(0));
    });
  });

  group('slotFromSelection', () {
    test('keeps a highlighted syllable as a char slot', () {
      expect(
        slotFromSelection('little star', 0, 4),
        const PlacementSlot.char(start: 0, end: 4),
      );
    });

    test('converts a whitespace-only highlight to a gap', () {
      expect(slotFromSelection('little star', 6, 7), _gap(6));
    });
  });

  group('slotsForLine', () {
    test('lists line start, graphemes, whitespace runs and line end', () {
      expect(
        slotsForLine(_line('ab c')),
        [
          _gap(0),
          const PlacementSlot.char(start: 0, end: 1),
          const PlacementSlot.char(start: 1, end: 2),
          _gap(2),
          const PlacementSlot.char(start: 3, end: 4),
          _gap(4),
        ],
      );
    });

    test('collapses a multi-space run into one slot', () {
      final slots = slotsForLine(_line('a   b'));
      expect(
        slots.whereType<GapPlacementSlot>().toList(),
        [_gap(0), _gap(1), _gap(5)],
      );
    });
  });

  group('gapZonesForLine', () {
    test('reports run extents so the editor can size hit targets', () {
      expect(
        gapZonesForLine(_line('a   b')),
        [
          const GapZone(
            index: 0,
            endIndex: 0,
            kind: GapZoneKind.lineStart,
          ),
          const GapZone(
            index: 1,
            endIndex: 4,
            kind: GapZoneKind.between,
          ),
          const GapZone(
            index: 5,
            endIndex: 5,
            kind: GapZoneKind.lineEnd,
          ),
        ],
      );
    });
  });

  group('applyPlacement — char slots', () {
    test('anchors a chord on a highlighted syllable', () {
      final result = applyPlacement(
        _line('little star'),
        const PlacementSlot.char(start: 4, end: 6),
        'C',
      );
      expect(result.line.lyrics, 'little star');
      _expectMark(result.line.chords.single, 'C', 4, 6);
    });

    test('replaces the chord already on that slot', () {
      final start = _line('little', [
        const ChordMark(chord: 'C', start: 0, end: 1),
      ]);
      final result = applyPlacement(
        start,
        const PlacementSlot.char(start: 0, end: 1),
        'G',
      );
      _expectMark(result.line.chords.single, 'G', 0, 1);
    });
  });

  group('prepareGapPlacement', () {
    test('maps a free space in the gap to a char slot without changing lyrics', () {
      final result = prepareGapPlacement(_line('Twinkle Twinkle'), 7);
      expect(result.line.lyrics, 'Twinkle Twinkle');
      expect(result.slot, const PlacementSlot.char(start: 7, end: 8));
      expect(result.preparedSpacerAt, isNull);
    });

    test('inserts a spacer when the gap already has a chord', () {
      final withC = applyPlacement(_line('Twinkle Twinkle'), _gap(7), 'C').line;
      final result = prepareGapPlacement(withC, 7);

      expect(result.line.lyrics, 'Twinkle   Twinkle');
      expect(result.slot, const PlacementSlot.char(start: 8, end: 9));
      expect(result.preparedSpacerAt, 8);
      expect(result.preparedSpacerCount, 2);
      expect(gapPreviewAnchor(withC, 7), 8);
    });

    test('rewinds a preview spacer when placement is cancelled', () {
      final prepared = prepareGapPlacement(
        applyPlacement(_line('Twinkle Twinkle'), _gap(7), 'C').line,
        7,
      );
      final rewound = rewindPreparedGapSpacer(
        prepared.line,
        prepared.preparedSpacerAt!,
        prepared.preparedSpacerCount,
      );
      expect(rewound.lyrics, 'Twinkle Twinkle');
      _expectMark(rewound.chords.single, 'C', 7, 8);
    });
  });

  group('applyPlacement — gaps between words', () {
    test('reuses the existing space without touching the lyrics', () {
      final result = applyPlacement(_line('little star'), _gap(6), 'C');
      expect(result.line.lyrics, 'little star');
      _expectMark(result.line.chords.single, 'C', 6, 7);
    });

    test('adds a spacer for a second chord in the same gap, to the right of the first', () {
      final result = _placeAll(_line('little star'), [
        (slot: _gap(6), chord: 'C'),
        (slot: _gap(6), chord: 'G'),
      ]);

      expect(result.lyrics, 'little   star');
      _expectMark(result.chords[0], 'C', 6, 7);
      _expectMark(result.chords[1], 'G', 7, 8);
    });

    test('keeps stacking chords in click order', () {
      final result = _placeAll(_line('little star'), [
        (slot: _gap(6), chord: 'C'),
        (slot: _gap(6), chord: 'G'),
        (slot: _gap(6), chord: 'Am'),
      ]);

      expect(result.lyrics, 'little   star');
      expect(result.chords.map((m) => normalizeChordMark(m).chord), [
        'C',
        'G',
        'Am',
      ]);
      expect(result.chords.map((m) => getMarkStart(m)), [6, 7, 8]);
    });

    test('resolves a gap addressed from the far side of the space to the same anchor', () {
      final result = applyPlacement(_line('little star'), _gap(7), 'C');
      expect(result.line.lyrics, 'little star');
      _expectMark(result.line.chords.single, 'C', 6, 7);
    });
  });

  group('applyPlacement — end of line', () {
    test('appends a spacer when the line has no trailing space', () {
      final result = applyPlacement(_line('star'), _gap(4), 'C');
      expect(result.line.lyrics, 'star ');
      _expectMark(result.line.chords.single, 'C', 4, 5);
    });

    test('supports several chords after the last word', () {
      final result = _placeAll(_line('Twinkle twinkle little star'), [
        (slot: _gap(27), chord: 'C'),
        (slot: _gap(27), chord: 'G'),
      ]);

      expect(result.lyrics, 'Twinkle twinkle little star   ');
      expect(result.chords.map((m) => getMarkStart(m)), [27, 28]);
    });
  });

  group('applyPlacement — before the first word', () {
    test('inserts leading spacers for chords ahead of the lyric', () {
      final result = _placeAll(_line('How i wonder'), [
        (slot: _gap(0), chord: 'C'),
        (slot: _gap(0), chord: 'G'),
      ]);

      expect(result.lyrics, '   How i wonder');
      _expectMark(result.chords[0], 'C', 0, 1);
      _expectMark(result.chords[1], 'G', 1, 2);
    });

    test('shifts chords already on the line when inserting at the start', () {
      final start = _line('How', [
        const ChordMark(chord: 'Am', start: 0, end: 1),
      ]);
      final result = applyPlacement(start, _gap(0), 'C');

      expect(result.line.lyrics, ' How');
      _expectMark(result.line.chords[0], 'C', 0, 1);
      _expectMark(result.line.chords[1], 'Am', 1, 2);
    });
  });

  group('mark ordering', () {
    test('keeps marks sorted by position regardless of placement order', () {
      final result = _placeAll(_line('Twinkle twinkle little star'), [
        (slot: _gap(27), chord: 'F'),
        (slot: const PlacementSlot.char(start: 0, end: 1), chord: 'C'),
        (slot: _gap(7), chord: 'Am'),
      ]);

      expect(result.chords.map((m) => getMarkStart(m)), [0, 7, 27]);
    });

    test('survives a ChordPro round-trip unchanged, field order included', () {
      final placed = _placeAll(_line('little star'), [
        (slot: _gap(6), chord: 'G'),
        (slot: const PlacementSlot.char(start: 0, end: 1), chord: 'C'),
      ]);

      final reparsed = parseChordProLine(serializeChordProLine(placed));
      _expectLine(reparsed, placed);
    });
  });

  group('ChordPro round-trip', () {
    test('round-trips chords stacked in a gap', () {
      final placed = _placeAll(_line('little star'), [
        (slot: _gap(6), chord: 'C'),
        (slot: _gap(6), chord: 'G'),
      ]);

      final reparsed = parseChordProLine(serializeChordProLine(placed));
      expect(reparsed.lyrics, placed.lyrics);
      for (var i = 0; i < placed.chords.length; i++) {
        _expectMark(
          reparsed.chords[i],
          placed.chords[i].chord,
          getMarkStart(placed.chords[i]),
          getMarkEnd(placed.chords[i]),
        );
      }
    });

    test('round-trips chords at the end of a line', () {
      final placed = _placeAll(_line('star'), [
        (slot: _gap(4), chord: 'C'),
        (slot: _gap(4), chord: 'G'),
      ]);

      final reparsed = parseChordProLine(serializeChordProLine(placed));
      expect(reparsed.lyrics, placed.lyrics);
      expect(
        reparsed.chords.map((m) => normalizeChordMark(m).chord),
        ['C', 'G'],
      );
    });

    test('round-trips chords before the first word', () {
      final placed = _placeAll(_line('How i wonder'), [
        (slot: _gap(0), chord: 'C'),
        (slot: _gap(0), chord: 'G'),
      ]);

      final reparsed = parseChordProLine(serializeChordProLine(placed));
      expect(reparsed.lyrics, placed.lyrics);
      for (var i = 0; i < placed.chords.length; i++) {
        _expectMark(
          reparsed.chords[i],
          placed.chords[i].chord,
          getMarkStart(placed.chords[i]),
          getMarkEnd(placed.chords[i]),
        );
      }
    });

    test('keeps marks inside the lyric bounds', () {
      final placed = _placeAll(_line('Twinkle twinkle little star'), [
        (slot: const PlacementSlot.char(start: 16, end: 17), chord: 'C'),
        (slot: _gap(27), chord: 'G'),
        (slot: _gap(27), chord: 'Am'),
      ]);

      for (final mark in placed.chords) {
        final start = getMarkStart(mark);
        final end = getMarkEnd(mark);
        expect(start, lessThan(placed.lyrics.length));
        expect(end, lessThanOrEqualTo(placed.lyrics.length));
      }
    });
  });

  group('removePlacementAt', () {
    test('removes a spacer along with its chord', () {
      final placed = _placeAll(_line('little star'), [
        (slot: _gap(6), chord: 'C'),
        (slot: _gap(6), chord: 'G'),
      ]);

      final result = removePlacementAt(placed, 7);
      expect(result.lyrics, 'little  star');
      _expectMark(result.chords.single, 'C', 6, 7);
    });

    test('keeps a real word separator when its chord is removed', () {
      final placed = applyPlacement(_line('little star'), _gap(6), 'C').line;
      final result = removePlacementAt(placed, 6);

      expect(result.lyrics, 'little star');
      expect(result.chords, isEmpty);
    });

    test('removes a trailing spacer', () {
      final placed = applyPlacement(_line('star'), _gap(4), 'C').line;
      _expectLine(removePlacementAt(placed, 4), _line('star'));
    });

    test('leaves chords on letters alone', () {
      final placed = applyPlacement(
        _line('star'),
        const PlacementSlot.char(start: 0, end: 1),
        'C',
      ).line;
      _expectLine(removePlacementAt(placed, 0), _line('star'));
    });
  });

  group('isRemovableSpacer', () {
    test('accepts doubled, leading and trailing spaces', () {
      expect(isRemovableSpacer('a  b', 1), isTrue);
      expect(isRemovableSpacer(' ab', 0), isTrue);
      expect(isRemovableSpacer('ab ', 2), isTrue);
    });

    test('rejects a single separator between words', () {
      expect(isRemovableSpacer('a b', 1), isFalse);
    });

    test('rejects non-space positions', () {
      expect(isRemovableSpacer('ab', 0), isFalse);
    });
  });

  group('nextSlot / prevSlot', () {
    test('walks forward through gaps and graphemes', () {
      final target = _line('ab c');
      expect(
        nextSlot(target, _gap(0)),
        const PlacementSlot.char(start: 0, end: 1),
      );
      expect(
        nextSlot(target, const PlacementSlot.char(start: 1, end: 2)),
        _gap(2),
      );
    });

    test('stops at the line end', () {
      final target = _line('ab');
      expect(nextSlot(target, _gap(2)), _gap(2));
    });

    test('walks backward', () {
      final target = _line('ab c');
      expect(
        prevSlot(target, const PlacementSlot.char(start: 3, end: 4)),
        _gap(2),
      );
    });
  });

  group('describeSlot', () {
    const open = '\u201C';
    const close = '\u201D';

    test('names the words around a gap', () {
      expect(
        describeSlot(_line('little star'), _gap(6)),
        'Gap · between ${open}little$close and ${open}star$close',
      );
    });

    test('names the end of a line', () {
      expect(
        describeSlot(_line('little star'), _gap(11)),
        'End of line · after ${open}star$close',
      );
    });

    test('names the start of a line', () {
      expect(
        describeSlot(_line('How i wonder'), _gap(0)),
        'Gap · before ${open}How$close',
      );
    });

    test('names a syllable inside its word', () {
      expect(
        describeSlot(
          _line('little star'),
          const PlacementSlot.char(start: 4, end: 6),
        ),
        'On ${open}le$close in ${open}little$close',
      );
    });
  });

  group('findChordAtSlot', () {
    test('finds the chord on a char slot', () {
      final target = _line('star', [
        const ChordMark(chord: 'C', start: 0, end: 1),
      ]);
      expect(
        findChordAtSlot(
          target,
          const PlacementSlot.char(start: 0, end: 1),
        )?.chord,
        'C',
      );
    });

    test('treats gap slots as empty, since they resolve to a free anchor', () {
      final target = _line('a b', [
        const ChordMark(chord: 'C', start: 1, end: 2),
      ]);
      expect(findChordAtSlot(target, _gap(1)), isNull);
    });
  });
}
