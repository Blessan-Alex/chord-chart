/** Section label lines: `{Verse 1}` or `Verse 1:` — square brackets are chords only. */

const SECTION_LABEL_RE =
  /^(verse|chorus|bridge|intro|outro|tag|pre-chorus|instrumental|hook|refrain|breakdown|interlude|section)(\s+\d+)?$/i;

export function isSectionHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  if (/^\{.+\}$/.test(trimmed)) {
    return true;
  }

  const colonMatch = trimmed.match(/^(.*?):$/);
  if (!colonMatch) {
    return false;
  }

  return SECTION_LABEL_RE.test(colonMatch[1].trim());
}

export function parseSectionHeaderLabel(line: string): string | null {
  const trimmed = line.trim();
  const curlyMatch = trimmed.match(/^\{(.+)\}$/);
  if (curlyMatch) {
    return curlyMatch[1].trim();
  }

  const colonMatch = trimmed.match(/^(.*?):$/);
  if (colonMatch && SECTION_LABEL_RE.test(colonMatch[1].trim())) {
    return colonMatch[1].trim();
  }

  return null;
}
