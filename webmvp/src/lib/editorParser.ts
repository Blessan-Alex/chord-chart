import { isSectionHeaderLine, parseSectionHeaderLabel } from "./sectionHeaders";
import type { Section } from "./types";

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

    if (isSectionHeaderLine(line)) {
      const label = parseSectionHeaderLabel(line) ?? line;
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
