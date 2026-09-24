import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/chord_pro_parser.dart';

String sectionsSignature(List<Section> sections) {
  return sections
      .map(
        (s) =>
            '${s.label}|${s.lines.map((l) => '${l.lyrics}#${l.chords.length}').join(';')}',
      )
      .join('\n');
}

sealed class FlushResult {
  const FlushResult();
}

class FlushOk extends FlushResult {
  const FlushOk(this.sections);
  final List<Section> sections;
}

class FlushError extends FlushResult {
  const FlushError(this.message);
  final String message;
}

FlushResult tryFlushChordSource(String sourceText) {
  try {
    final sections = parseChordProSections(sourceText);
    if (sections.every((section) => section.lines.isEmpty)) {
      return const FlushError('Add at least one lyric line.');
    }
    return FlushOk(sections);
  } catch (error) {
    return FlushError(
      error is Exception ? error.toString().replaceFirst('Exception: ', '') : 'Could not parse chord source.',
    );
  }
}

String syncSourceTextFromSections(List<Section> sections) {
  return sectionsToChordProText(sections);
}
