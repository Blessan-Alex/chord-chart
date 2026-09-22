class LanguageTagOption {
  const LanguageTagOption({required this.value, required this.label});

  final String value;
  final String label;
}

const List<LanguageTagOption> languageTags = [
  LanguageTagOption(value: 'lang:english', label: 'English'),
  LanguageTagOption(value: 'lang:malayalam', label: 'Malayalam'),
  LanguageTagOption(value: 'lang:hindi', label: 'Hindi'),
  LanguageTagOption(value: 'lang:tamil', label: 'Tamil'),
  LanguageTagOption(value: 'lang:marathi', label: 'Marathi'),
  LanguageTagOption(value: 'lang:telugu', label: 'Telugu'),
];

const String languageTagPrefix = 'lang:';

bool isLanguageTag(String tag) => tag.startsWith(languageTagPrefix);

String? languageLabel(String tag) {
  for (final entry in languageTags) {
    if (entry.value == tag) {
      return entry.label;
    }
  }
  return null;
}

String? getLanguageTag(List<String> tags) {
  for (final tag in tags) {
    if (isLanguageTag(tag)) {
      return tag;
    }
  }
  return null;
}

String libraryFilterLabel({
  required String keyFilter,
  required String languageFilter,
  required String artistFilter,
}) {
  final parts = <String>[];
  if (keyFilter.isNotEmpty) {
    parts.add(keyFilter);
  }
  if (languageFilter.isNotEmpty) {
    final label = languageLabel(languageFilter);
    if (label != null) {
      parts.add(label);
    }
  }
  if (artistFilter.isNotEmpty) {
    parts.add(artistFilter);
  }
  if (parts.isEmpty) {
    return 'Filter';
  }
  return 'Filter · ${parts.join(' · ')}';
}
