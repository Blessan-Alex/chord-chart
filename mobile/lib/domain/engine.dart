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
  });

  final int rootNum;
  final String suffix;
  final int? bassNum;
}

final RegExp _chordRe = RegExp(r'^([A-Ga-g][#b]?)(.*?)(?:\/([A-Ga-g][#b]?))?$');

ParsedChord parseChord(String input) {
  final trimmed = input.trim();
  final m = _chordRe.firstMatch(trimmed);
  if (m == null) {
    throw FormatException('Invalid chord: $input');
  }

  final rootRaw = m.group(1)!;
  final root = rootRaw[0].toUpperCase() + rootRaw.substring(1);
  final rootNum = _noteToNum[root];
  if (rootNum == null) {
    throw FormatException('Unknown root: $root');
  }

  final suffix = m.group(2) ?? '';

  int? bassNum;
  final bassRaw = m.group(3);
  if (bassRaw != null) {
    final bass = bassRaw[0].toUpperCase() + bassRaw.substring(1);
    bassNum = _noteToNum[bass];
    if (bassNum == null) {
      throw FormatException('Unknown bass: $bass');
    }
  }

  return ParsedChord(rootNum: rootNum, suffix: suffix, bassNum: bassNum);
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
