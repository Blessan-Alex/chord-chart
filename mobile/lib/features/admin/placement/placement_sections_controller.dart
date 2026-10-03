import 'package:flutter/foundation.dart';
import 'package:lf_chords/data/models/chord_mark.dart';
import 'package:lf_chords/data/models/lyric_line.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/chord_marks.dart';
import 'package:lf_chords/domain/chord_placement.dart';
import 'package:lf_chords/domain/chord_pro_parser.dart';
import 'package:lf_chords/domain/chord_source_sync.dart';
import 'package:lf_chords/domain/engine.dart';

const _maxHistory = 40;

class PendingGapSpacer {
  const PendingGapSpacer({
    required this.sIndex,
    required this.lIndex,
    required this.index,
    required this.count,
    required this.gapIndex,
  });

  final int sIndex;
  final int lIndex;
  final int index;
  final int count;
  final int gapIndex;
}

class ActivePlacement {
  const ActivePlacement({
    required this.sIndex,
    required this.lIndex,
    required this.slot,
    required this.currentVal,
  });

  final int sIndex;
  final int lIndex;
  final PlacementSlot slot;
  final String currentVal;
}

List<Section> cloneSections(List<Section> sections) {
  return sections
      .map(
        (section) => Section(
          label: section.label,
          lines: section.lines
              .map(
                (line) => LyricLine(
                  lyrics: line.lyrics,
                  chords: [...line.chords],
                ),
              )
              .toList(),
        ),
      )
      .toList();
}

List<Section> replaceLine(
  List<Section> sections,
  int sIndex,
  int lIndex,
  LyricLine line,
) {
  return sections.asMap().entries.map((entry) {
    if (entry.key != sIndex) {
      return entry.value;
    }
    return Section(
      label: entry.value.label,
      lines: entry.value.lines.asMap().entries.map((le) {
        if (le.key != lIndex) {
          return le.value;
        }
        return line;
      }).toList(),
    );
  }).toList();
}

List<Section> insertLineAfter(
  List<Section> sections,
  int sIndex,
  int afterLIndex,
  LyricLine line,
) {
  return sections.asMap().entries.map((entry) {
    if (entry.key != sIndex) {
      return entry.value;
    }
    final lines = entry.value.lines;
    return Section(
      label: entry.value.label,
      lines: [
        ...lines.sublist(0, afterLIndex + 1),
        line,
        ...lines.sublist(afterLIndex + 1),
      ],
    );
  }).toList();
}

({int start, int end}) slotAfterPreviewSpacerRewind(
  ChordMark mark,
  int spacerIndex,
  int count,
) {
  final normalized = normalizeChordMark(mark);
  final lastRemoved = spacerIndex + count - 1;
  if (normalized.start! <= lastRemoved) {
    return (start: normalized.start!, end: normalized.end!);
  }
  return (
    start: normalized.start! - count,
    end: normalized.end! - count,
  );
}

class PlacementSectionsController extends ChangeNotifier {
  PlacementSectionsController({
    required List<Section> initialSections,
    required void Function(List<Section> sections) onSectionsChanged,
  })  : _onSectionsChanged = onSectionsChanged,
        _sections = cloneSections(initialSections) {
    _emittedSig = sectionsSignature(initialSections);
    _lastParentSig = _emittedSig;
  }

  final void Function(List<Section> sections) _onSectionsChanged;

  List<Section> _sections;
  List<Section> get sections => _sections;

  final List<List<Section>> _history = [];
  bool get canUndo => _history.isNotEmpty;

  String? _lastChord;
  String? get lastChord => _lastChord;

  String? _quickChord;
  String? get quickChord => _quickChord;

  ActivePlacement? _active;
  ActivePlacement? get active => _active;

  String? _chordError;
  String? get chordError => _chordError;

  PendingGapSpacer? _pendingGapSpacer;
  late String _emittedSig;
  late String _lastParentSig;

  int get chordCount => countChordsInSections(_sections);

  int get lineCount =>
      _sections.fold(0, (n, section) => n + section.lines.length);

  int get chordedLines => _sections.fold(0, (n, section) {
        return n +
            section.lines.where((line) => line.chords.isNotEmpty).length;
      });

  List<LyricLine> get allLines =>
      _sections.expand((section) => section.lines).toList();

  List<String> get recents => chordsUsedIn(allLines);

  List<String> diatonicPalette(String originalKey) => getDiatonicChords(originalKey);

  String? get activeTargetLabel {
    final placement = _active;
    if (placement == null) {
      return null;
    }
    final line = _lineAt(placement.sIndex, placement.lIndex);
    if (line == null) {
      return null;
    }
    return describeSlot(line, placement.slot);
  }

  bool get canRemoveActiveChord {
    final placement = _active;
    if (placement == null) {
      return false;
    }
    final line = _lineAt(placement.sIndex, placement.lIndex);
    if (line == null) {
      return false;
    }
    return findChordAtSlot(line, placement.slot) != null;
  }

  void syncFromParent(List<Section> parentSections) {
    final sig = sectionsSignature(parentSections);
    if (sig == _emittedSig) {
      _lastParentSig = sig;
      return;
    }
    if (sig == _lastParentSig) {
      return;
    }
    _lastParentSig = sig;
    _emittedSig = sig;
    _pendingGapSpacer = null;
    _sections = cloneSections(parentSections);
    _history.clear();
    _active = null;
    _chordError = null;
    notifyListeners();
  }

  void emit(List<Section> next, {bool notifyParent = true}) {
    _emittedSig = sectionsSignature(next);
    _sections = cloneSections(next);
    if (notifyParent) {
      _onSectionsChanged(_sections);
    }
    notifyListeners();
  }

  void commitSections(
    List<Section> next, {
    bool record = true,
    List<Section>? recordFrom,
  }) {
    if (record) {
      final snapshot = cloneSections(recordFrom ?? _sections);
      _history.add(snapshot);
      if (_history.length > _maxHistory) {
        _history.removeAt(0);
      }
    }
    emit(next);
  }

  void undo() {
    if (_history.isEmpty) {
      return;
    }
    final previous = _history.removeLast();
    emit(previous);
    _pendingGapSpacer = null;
    _active = null;
    _chordError = null;
  }

  void toggleQuickChord() {
    if (_quickChord != null) {
      _quickChord = null;
    } else {
      _quickChord = _lastChord;
    }
    notifyListeners();
  }

  void disarmQuickChord() {
    _quickChord = null;
    notifyListeners();
  }

  ({List<Section> sections, bool changed}) _rewindPendingGapSpacerInto(
    List<Section> current,
  ) {
    final pending = _pendingGapSpacer;
    if (pending == null) {
      return (sections: current, changed: false);
    }

    final line = current[pending.sIndex].lines[pending.lIndex];
    _pendingGapSpacer = null;

    final rewound = rewindPreparedGapSpacer(
      line,
      pending.index,
      pending.count,
    );
    if (rewound.lyrics == line.lyrics) {
      return (sections: current, changed: false);
    }

    return (
      sections: replaceLine(current, pending.sIndex, pending.lIndex, rewound),
      changed: true,
    );
  }

  List<Section> persistSectionsWithoutGapPreview() {
    final result = _rewindPendingGapSpacerInto(_sections);
    if (result.changed) {
      emit(result.sections, notifyParent: false);
    }
    return _sections;
  }

  void clearPlacement() {
    final result = _rewindPendingGapSpacerInto(_sections);
    if (result.changed) {
      emit(result.sections, notifyParent: false);
    }
    _chordError = null;
    _active = null;
    notifyListeners();
  }

  void stampChord(
    int sIndex,
    int lIndex,
    PlacementSlot slot,
    String chord, {
    LyricLine? lineOverride,
  }) {
    final line = lineOverride ?? _lineAt(sIndex, lIndex);
    if (line == null) {
      return;
    }

    List<Section>? recordFrom;
    final pending = _pendingGapSpacer;
    if (pending != null &&
        pending.sIndex == sIndex &&
        pending.lIndex == lIndex &&
        lineOverride != null) {
      final snapshotLine = _sections[pending.sIndex].lines[pending.lIndex];
      final rewound = rewindPreparedGapSpacer(
        snapshotLine,
        pending.index,
        pending.count,
      );
      if (rewound.lyrics != snapshotLine.lyrics) {
        recordFrom = replaceLine(_sections, sIndex, lIndex, rewound);
      }
    }

    final applied = applyPlacement(line, slot, chord);
    final base = lineOverride != null
        ? replaceLine(_sections, sIndex, lIndex, lineOverride)
        : _sections;
    commitSections(
      replaceLine(base, sIndex, lIndex, applied.line),
      recordFrom: recordFrom,
    );
    _pendingGapSpacer = null;
    _lastChord = chord;
    notifyListeners();
  }

  void openSlot(int sIndex, int lIndex, PlacementSlot slot) {
    final rewind = _rewindPendingGapSpacerInto(_sections);
    var baseSections = rewind.sections;
    if (rewind.changed) {
      emit(baseSections, notifyParent: false);
    }

    var line = baseSections[sIndex].lines[lIndex];
    var resolvedSlot = slot;

    if (slot is GapPlacementSlot) {
      final prepared = prepareGapPlacement(line, slot.index);
      line = prepared.line;
      resolvedSlot = prepared.slot;
      if (prepared.preparedSpacerAt != null) {
        _pendingGapSpacer = PendingGapSpacer(
          sIndex: sIndex,
          lIndex: lIndex,
          index: prepared.preparedSpacerAt!,
          count: prepared.preparedSpacerCount,
          gapIndex: slot.index,
        );
        emit(
          replaceLine(baseSections, sIndex, lIndex, line),
          notifyParent: false,
        );
      }
    }

    if (_quickChord != null) {
      stampChord(sIndex, lIndex, resolvedSlot, _quickChord!, lineOverride: line);
      _active = null;
      _chordError = null;
      return;
    }

    final existing = findChordAtSlot(line, resolvedSlot);
    _chordError = null;
    _active = ActivePlacement(
      sIndex: sIndex,
      lIndex: lIndex,
      slot: resolvedSlot,
      currentVal: existing?.chord ?? '',
    );
    notifyListeners();
  }

  void placeChord({String? rawValue, bool advance = false}) {
    final active = _active;
    if (active == null) {
      return;
    }

    final chord = (rawValue ?? active.currentVal).trim();
    if (chord.isEmpty) {
      removeChord();
      return;
    }
    if (!isValidChord(chord)) {
      _chordError = 'Invalid chord. Try Am7, G/B, or Dsus4.';
      notifyListeners();
      return;
    }

    final line = _sections[active.sIndex].lines[active.lIndex];
    List<Section>? recordFrom;
    final pending = _pendingGapSpacer;
    if (pending != null &&
        pending.sIndex == active.sIndex &&
        pending.lIndex == active.lIndex) {
      final rewound = rewindPreparedGapSpacer(
        line,
        pending.index,
        pending.count,
      );
      if (rewound.lyrics != line.lyrics) {
        recordFrom = replaceLine(
          _sections,
          pending.sIndex,
          pending.lIndex,
          rewound,
        );
      }
    }

    final applied = applyPlacement(line, active.slot, chord);
    commitSections(
      replaceLine(_sections, active.sIndex, active.lIndex, applied.line),
      recordFrom: recordFrom,
    );
    _lastChord = chord;
    _chordError = null;
    _pendingGapSpacer = null;

    if (advance) {
      _active = ActivePlacement(
        sIndex: active.sIndex,
        lIndex: active.lIndex,
        slot: nextSlot(applied.line, applied.slot),
        currentVal: chord,
      );
      notifyListeners();
      return;
    }

    clearPlacement();
  }

  void removeChord() {
    final active = _active;
    if (active == null || active.slot is! CharPlacementSlot) {
      clearPlacement();
      return;
    }

    final charSlot = active.slot as CharPlacementSlot;
    final line = _sections[active.sIndex].lines[active.lIndex];
    commitSections(
      replaceLine(
        _sections,
        active.sIndex,
        active.lIndex,
        removePlacementAt(line, charSlot.start),
      ),
    );
    clearPlacement();
  }

  void moveSlot(int direction) {
    final active = _active;
    if (active == null || direction == 0) {
      return;
    }

    final step = direction < 0 ? -1 : 1;
    final pendingBefore = _pendingGapSpacer;
    final rewind = _rewindPendingGapSpacerInto(_sections);
    var baseSections = rewind.sections;
    if (rewind.changed) {
      emit(baseSections, notifyParent: false);
    }

    final line = baseSections[active.sIndex].lines[active.lIndex];
    var fromSlot = active.slot;
    if (rewind.changed &&
        pendingBefore != null &&
        pendingBefore.sIndex == active.sIndex &&
        pendingBefore.lIndex == active.lIndex) {
      fromSlot = PlacementSlot.gap(index: pendingBefore.gapIndex);
    }

    final slot = step < 0
        ? prevSlot(line, fromSlot)
        : nextSlot(line, fromSlot);
    _active = ActivePlacement(
      sIndex: active.sIndex,
      lIndex: active.lIndex,
      slot: slot,
      currentVal: active.currentVal,
    );
    _chordError = null;
    notifyListeners();
  }

  void insertChordLine(int sIndex, int afterLIndex) {
    final pendingBefore = _pendingGapSpacer;
    final rewind = _rewindPendingGapSpacerInto(_sections);
    var baseSections = rewind.sections;
    if (rewind.changed) {
      emit(baseSections, notifyParent: false);
    }

    commitSections(
      insertLineAfter(
        baseSections,
        sIndex,
        afterLIndex,
        const LyricLine(lyrics: '', chords: []),
      ),
      recordFrom: baseSections,
    );
    _chordError = null;

    final prev = _active;
    if (prev == null) {
      notifyListeners();
      return;
    }
    if (pendingBefore != null &&
        prev.sIndex == pendingBefore.sIndex &&
        prev.lIndex == pendingBefore.lIndex) {
      _active = null;
    } else if (prev.sIndex == sIndex && prev.lIndex > afterLIndex) {
      _active = ActivePlacement(
        sIndex: prev.sIndex,
        lIndex: prev.lIndex + 1,
        slot: prev.slot,
        currentVal: prev.currentVal,
      );
    }
    notifyListeners();
  }

  void beginChordEdit(int sIndex, int lIndex, ChordMark mark) {
    final pendingBefore = _pendingGapSpacer;
    final rewind = _rewindPendingGapSpacerInto(_sections);
    var baseSections = rewind.sections;
    if (rewind.changed) {
      emit(baseSections, notifyParent: false);
    }

    final line = baseSections[sIndex].lines[lIndex];
    final normalized = normalizeChordMark(mark);
    var start = normalized.start!;
    var end = normalized.end!;

    if (rewind.changed &&
        pendingBefore != null &&
        pendingBefore.sIndex == sIndex &&
        pendingBefore.lIndex == lIndex) {
      final remapped = slotAfterPreviewSpacerRewind(
        mark,
        pendingBefore.index,
        pendingBefore.count,
      );
      start = remapped.start;
      end = remapped.end;
    }

    for (final onLine in line.chords) {
      final candidate = normalizeChordMark(onLine);
      if (candidate.start == start && candidate.chord == normalized.chord) {
        start = candidate.start!;
        end = candidate.end!;
        break;
      }
    }

    _chordError = null;
    _active = ActivePlacement(
      sIndex: sIndex,
      lIndex: lIndex,
      slot: PlacementSlot.char(start: start, end: end),
      currentVal: normalized.chord,
    );
    notifyListeners();
  }

  void updateActiveChordValue(String value) {
    final active = _active;
    if (active == null) {
      return;
    }
    _chordError = null;
    _active = ActivePlacement(
      sIndex: active.sIndex,
      lIndex: active.lIndex,
      slot: active.slot,
      currentVal: value,
    );
    notifyListeners();
  }

  LyricLine? _lineAt(int sIndex, int lIndex) {
    if (sIndex < 0 || sIndex >= _sections.length) {
      return null;
    }
    final section = _sections[sIndex];
    if (lIndex < 0 || lIndex >= section.lines.length) {
      return null;
    }
    return section.lines[lIndex];
  }
}
