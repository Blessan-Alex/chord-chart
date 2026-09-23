import 'package:lf_chords/domain/engine.dart';

export 'engine.dart' show allKeys, allKeysSet, isValidKey;

int keyIndex(String key) => allKeys.indexOf(key);

String transposeKeyBy(String key, int semitones) {
  final idx = (keyIndex(key) + semitones + allKeys.length) % allKeys.length;
  return allKeys[idx];
}

bool isKey(String value) => isValidKey(value);
