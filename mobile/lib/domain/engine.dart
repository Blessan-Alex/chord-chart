// 12-semitone transposition engine (port of web `engine.ts`).

const Map<String, int> _noteToNum = {
  'C': 0,
  'B#': 0,
  'C#': 1,
  'Db': 1,
  'D': 2,
  'D#': 3,
  'Eb': 3,
  'E': 4,
  'Fb': 4,
  'F': 5,
  'E#': 5,
  'F#': 6,
  'Gb': 6,
  'G': 7,
  'G#': 8,
  'Ab': 8,
  'A': 9,
  'A#': 10,
  'Bb': 10,
  'B': 11,
  'Cb': 11,
};

const List<String> _sharpNames = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

const List<String> _flatNames = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

const Set<String> _flatKeys = {'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'};

const List<String> allKeys = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

const Set<String> allKeysSet = {
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
};

bool isValidKey(String? value) =>
    value != null && allKeysSet.contains(value);

int noteToNum(String note) {
  final n = _noteToNum[note];
  if (n == null) {
    throw FormatException('Unknown note: $note');
  }
  return n;
}

String spellNote(int semitone, String targetKey) {
  final n = (semitone % 12 + 12) % 12;
  return _flatKeys.contains(targetKey) ? _flatNames[n] : _sharpNames[n];
}

class ParsedChord {
  const ParsedChord({
    required this.rootNum,
    required this.suffix,
    this.bassNum,
    this.alternate,
  });

  final int rootNum;
  final String suffix;
  final int? bassNum;
  final String? alternate;
}

final RegExp _rootSuffixRe = RegExp(r'^([A-Ga-g][#b]?)(.*)$');

bool _isBassNoteToken(String token) {
  return RegExp(r'^[A-Ga-g][#b]?$').hasMatch(token.trim());
}

ParsedChord _parseRootAndSuffix(String input) {
  final m = _rootSuffixRe.firstMatch(input.trim());
  if (m == null) {
    throw FormatException('Invalid chord: $input');
  }

  final rootRaw = m.group(1)!;
  final root = rootRaw[0].toUpperCase() + rootRaw.substring(1);
  final rootNum = _noteToNum[root];
  if (rootNum == null) {
    throw FormatException('Unknown root: $root');
  }

  return ParsedChord(rootNum: rootNum, suffix: m.group(2) ?? '');
}

ParsedChord parseChord(String input) {
  final trimmed = input.trim();
  if (trimmed.isEmpty) {
    throw FormatException('Invalid chord: $input');
  }

  final slashAt = trimmed.indexOf('/');
  if (slashAt == -1) {
    return _parseRootAndSuffix(trimmed);
  }

  final head = trimmed.substring(0, slashAt);
  final tail = trimmed.substring(slashAt + 1);
  if (tail.isEmpty) {
    throw FormatException('Invalid chord: $input');
  }

  final parsed = _parseRootAndSuffix(head);

  if (_isBassNoteToken(tail)) {
    final bass = tail[0].toUpperCase() + tail.substring(1);
    final bassNum = _noteToNum[bass];
    if (bassNum == null) {
      throw FormatException('Unknown bass: $tail');
    }
    return ParsedChord(
      rootNum: parsed.rootNum,
      suffix: parsed.suffix,
      bassNum: bassNum,
    );
  }

  _parseRootAndSuffix(tail);
  return ParsedChord(
    rootNum: parsed.rootNum,
    suffix: parsed.suffix,
    alternate: tail,
  );
}

bool isValidChord(String input) {
  try {
    parseChord(input);
    return true;
  } catch (_) {
    return false;
  }
}

String transposeChord(String chord, String fromKey, String toKey) {
  final trimmed = chord.trim();
  if (trimmed.isEmpty) {
    return '';
  }
  if (fromKey == toKey) {
    return trimmed;
  }

  final interval = (noteToNum(toKey) - noteToNum(fromKey) + 12) % 12;
  final parsed = parseChord(trimmed);

  var result = spellNote(parsed.rootNum + interval, toKey) + parsed.suffix;
  if (parsed.alternate != null) {
    return '$result/${transposeChord(parsed.alternate!, fromKey, toKey)}';
  }
  if (parsed.bassNum != null) {
    result += '/${spellNote(parsed.bassNum! + interval, toKey)}';
  }
  return result;
}

const List<String> _intervalToNumber = [
  '1',
  'b2',
  '2',
  'b3',
  '3',
  '4',
  '#4',
  '5',
  'b6',
  '6',
  'b7',
  '7',
];

String _noteToDegree(int noteNum, String key) {
  final interval = (noteNum - noteToNum(key)) % 12;
  return _intervalToNumber[interval < 0 ? interval + 12 : interval];
}

String _suffixToNashville(String suffix) {
  if (suffix.isEmpty) {
    return '';
  }
  final low = suffix.toLowerCase();
  if (low.startsWith('m') && !low.startsWith('maj')) {
    return suffix;
  }
  if (low.startsWith('dim') || low == '°') {
    return low == '°' ? 'dim' : suffix;
  }
  if (low.startsWith('aug') || low == '+') {
    return low == '+' ? 'aug' : suffix;
  }
  return suffix;
}

String chordToDegree(String chord, String key) {
  final trimmed = chord.trim();
  if (trimmed.isEmpty) {
    return '';
  }
  final parsed = parseChord(trimmed);
  var degree = _noteToDegree(parsed.rootNum, key) + _suffixToNashville(parsed.suffix);
  if (parsed.alternate != null) {
    return '$degree/${chordToDegree(parsed.alternate!, key)}';
  }
  if (parsed.bassNum != null) {
    degree += '/${_noteToDegree(parsed.bassNum!, key)}';
  }
  return degree;
}

const List<({int interval, String quality})> _diatonicTriads = [
  (interval: 0, quality: ''),
  (interval: 5, quality: ''),
  (interval: 7, quality: ''),
  (interval: 9, quality: 'm'),
  (interval: 2, quality: 'm'),
  (interval: 4, quality: 'm'),
];

List<String> getDiatonicChords(String key) {
  final rootNum = noteToNum(key);
  return _diatonicTriads
      .map((t) => spellNote(rootNum + t.interval, key) + t.quality)
      .toList();
}
