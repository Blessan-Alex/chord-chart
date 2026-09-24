final RegExp _sectionLabelRe = RegExp(
  r'^(verse|chorus|bridge|intro|outro|tag|pre-chorus|instrumental|hook|refrain|breakdown|interlude|section)(\s+\d+)?$',
  caseSensitive: false,
);

bool isSectionHeaderLine(String line) {
  final trimmed = line.trim();
  if (RegExp(r'^\{.+\}$').hasMatch(trimmed)) {
    return true;
  }
  final colonMatch = RegExp(r'^(.*?):$').firstMatch(trimmed);
  if (colonMatch == null) {
    return false;
  }
  return _sectionLabelRe.hasMatch(colonMatch.group(1)!.trim());
}

String? parseSectionHeaderLabel(String line) {
  final trimmed = line.trim();
  final curlyMatch = RegExp(r'^\{(.+)\}$').firstMatch(trimmed);
  if (curlyMatch != null) {
    return curlyMatch.group(1)!.trim();
  }
  final colonMatch = RegExp(r'^(.*?):$').firstMatch(trimmed);
  if (colonMatch != null &&
      _sectionLabelRe.hasMatch(colonMatch.group(1)!.trim())) {
    return colonMatch.group(1)!.trim();
  }
  return null;
}
