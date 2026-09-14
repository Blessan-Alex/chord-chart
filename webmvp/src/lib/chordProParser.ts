import { getMarkStart, normalizeChordMark } from "./chordMarks";
import type { ChordMark, LyricLine, Section } from "./types";

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

  return SECTION_LABEL_RE.test(colonMatch[1].trim());
}

/** Parses "[Am]Amazing [G]grace" into lyrics + chord marks. */
export function parseChordProLine(input: string): LyricLine {
  const chords: ChordMark[] = [];
  let lyrics = "";
  let i = 0;

  while (i < input.length) {
    if (input[i] === "[") {
      const end = input.indexOf("]", i);
      if (end !== -1) {
        chords.push({
          chord: input.slice(i + 1, end),
          start: lyrics.length,
          end: lyrics.length + 1,
        });
        i = end + 1;
        continue;
      }
    }
    lyrics += input[i];
    i += 1;
  }

  return { lyrics, chords };
}

/** Parse multi-line ChordPro text with optional [Section] headers. */
export function parseChordProSections(rawText: string): Section[] {
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

    currentSection.lines.push(parseChordProLine(line));
  }

  if (sections.length === 0) {
    sections.push({ label: "Verse 1", lines: [] });
  }

  return sections;
}

export function serializeChordProLine(line: LyricLine): string {
  const chords = [...line.chords]
    .map(normalizeChordMark)
    .sort((a, b) => getMarkStart(a) - getMarkStart(b));

  if (chords.length === 0) {
    return line.lyrics;
  }

  let result = "";
  let cursor = 0;

  for (const mark of chords) {
    const start = getMarkStart(mark);
    result += line.lyrics.slice(cursor, start);
    result += `[${mark.chord}]`;
    cursor = start;
  }

  result += line.lyrics.slice(cursor);
  return result;
}

export function sectionsToChordProText(sections: Section[]): string {
  return sections
    .map((section) => {
      const header = `[${section.label}]`;
      const body = section.lines.map(serializeChordProLine).join("\n");
      return body ? `${header}\n${body}` : header;
    })
    .join("\n\n");
}

export function countChordsInSections(sections: Section[]): number {
  return sections.reduce(
    (total, section) =>
      total + section.lines.reduce((lineTotal, line) => lineTotal + line.chords.length, 0),
    0,
  );
}
