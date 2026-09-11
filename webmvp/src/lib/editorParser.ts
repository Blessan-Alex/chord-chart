import type { Section } from "./types";

const SECTION_LABEL_RE =
  /^(verse|chorus|bridge|intro|outro|tag|pre-chorus|instrumental|hook|refrain|breakdown|interlude|section)(\s+\d+)?$/i;

function isSectionHeader(line: string): boolean {
  const bracketMatch = line.match(/^\[(.+)\]$/);
  if (bracketMatch) {
    return true;
  }

  const colonMatch = line.match(/^(.*?):$/);
  if (!colonMatch) {
    return false;
  }

  const label = colonMatch[1].trim();
  return SECTION_LABEL_RE.test(label);
}

export function parseRawLyrics(rawText: string): Section[] {
  const lines = rawText.split(/\r?\n/);
  const sections: Section[] = [];
  
  let currentSection: Section | null = null;
  let defaultSectionCounter = 1;

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      continue;
    }

    if (isSectionHeader(line)) {
      const bracketMatch = line.match(/^\[(.*?)\]$/);
      const colonMatch = line.match(/^(.*?):$/);
      const label = (bracketMatch?.[1] ?? colonMatch?.[1] ?? line).trim();
      currentSection = { label, lines: [] };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      currentSection = { label: `Section ${defaultSectionCounter++}`, lines: [] };
      sections.push(currentSection);
    }

    currentSection.lines.push({ lyrics: line, chords: [] });
  }

  if (sections.length === 0) {
    sections.push({ label: "Verse 1", lines: [] });
  }

  return sections;
}
