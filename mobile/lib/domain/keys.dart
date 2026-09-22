/// Major keys for library filters (full engine in Phase 3).
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

bool isValidKey(String? value) {
  return value != null && allKeysSet.contains(value);
}
