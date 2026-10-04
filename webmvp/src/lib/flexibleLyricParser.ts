import { parseChordProLine } from "@/lib/chordProParser";
import {
  isSectionHeaderLine,
  parseSectionHeaderLabel,
} from "@/lib/sectionHeaders";
import type { Section } from "@/lib/types";

/**
 * Admin chord source: plain lyrics, optional ChordPro chords, optional `{headers}`.
 * Blank line between paragraphs → next section (`Verse 1`, `Verse 2`, …).
 */
export function parseFlexibleLyricSource(rawText: string): Section[] {
  const lines = rawText.split(/\r?\n/);
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let verseCounter = 1;

  const startSection = (label?: string): Section => {
    const sectionLabel = label ?? `Verse ${verseCounter++}`;
    const section: Section = { label: sectionLabel, lines: [] };
    sections.push(section);
    return section;
  };

  for (const rawLine of lines) {
    if (rawLine.trim() === "") {
      if (currentSection !== null && currentSection.lines.length > 0) {
        currentSection = null;
      }
      continue;
    }

    const trimmed = rawLine.trim();
    if (isSectionHeaderLine(trimmed)) {
      const label = parseSectionHeaderLabel(trimmed) ?? trimmed;
      currentSection = startSection(label);
      continue;
    }

    if (!currentSection) {
      currentSection = startSection();
    }
    const section = currentSection;

    section.lines.push(parseChordProLine(rawLine));
  }

  if (sections.length === 0) {
    sections.push({ label: "Verse 1", lines: [] });
  }

  return sections;
}
