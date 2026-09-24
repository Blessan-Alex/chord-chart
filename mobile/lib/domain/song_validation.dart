import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/engine.dart';
import 'package:lf_chords/domain/chord_marks.dart';

class SongValidationResult {
  const SongValidationResult._({required this.ok, this.errors = const []});

  final bool ok;
  final List<String> errors;

  factory SongValidationResult.success() =>
      const SongValidationResult._(ok: true);

  factory SongValidationResult.failure(List<String> errors) =>
      SongValidationResult._(ok: false, errors: errors);
}

SongValidationResult validateSongInput({
  required String title,
  required String originalKey,
  required List<Section> sections,
}) {
  final errors = <String>[];

  if (title.trim().isEmpty) {
    errors.add('Title is required');
  }
  if (!isValidKey(originalKey)) {
    errors.add('Invalid original key');
  }

  for (var s = 0; s < sections.length; s++) {
    final section = sections[s];
    for (var l = 0; l < section.lines.length; l++) {
      final line = section.lines[l];
      for (var c = 0; c < line.chords.length; c++) {
        final mark = normalizeChordMark(line.chords[c]);
        if (!isValidChord(mark.chord)) {
          errors.add('Section $s line $l chord $c: invalid "${mark.chord}"');
        }
      }
    }
  }

  if (errors.isNotEmpty) {
    return SongValidationResult.failure(errors);
  }
  return SongValidationResult.success();
}

void assertValidSongInput({
  required String title,
  required String originalKey,
  required List<Section> sections,
}) {
  final result = validateSongInput(
    title: title,
    originalKey: originalKey,
    sections: sections,
  );
  if (!result.ok) {
    throw Exception(result.errors.join('; '));
  }
}
