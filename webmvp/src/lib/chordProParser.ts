import { getMarkEnd, getMarkStart, normalizeChordMark } from "./chordMarks";
import {
  isSectionHeaderLine,
  parseSectionHeaderLabel,
} from "./sectionHeaders";
import type { ChordMark, LyricLine, Section } from "./types";

/** Parses "[Am]Amazing [G]grace" into lyrics + chord marks. */
export function parseChordProLine(input: string): LyricLine {
  const chords: ChordMark[] = [];
  let lyrics = "";
  let i = 0;

  while (i < input.length) {
    if (input[i] === "[") {
      const end = input.indexOf("]", i);
      if (end !== -1) {
        const atEndOfInput = end + 1 >= input.length;
        let start = lyrics.length;
        let markEnd = lyrics.length + 1;
        // Trailing `[A]` with no following lyric — anchor to last character.
        if (atEndOfInput && start > 0) {
          start = lyrics.length - 1;
          markEnd = lyrics.length;
        }
        chords.push({
          chord: input.slice(i + 1, end),
          start,
          end: markEnd,
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

/** Parse multi-line ChordPro text with optional `{Section}` headers. */
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

    currentSection.lines.push(parseChordProLine(line));
  }

  if (sections.length === 0) {
    sections.push({ label: "Verse 1", lines: [] });
  }

  return sections;
}

/** ChordPro trailing syntax (`are[A]`) maps to the last lyric character. */
function isTrailingChordMark(mark: ChordMark, lyricLength: number): boolean {
  if (lyricLength <= 0) {
    return false;
  }

  const start = getMarkStart(mark);
  const end = getMarkEnd(mark);
  return start === lyricLength - 1 && end === lyricLength;
}

export function serializeChordProLine(line: LyricLine): string {
  const chords = [...line.chords]
    .map(normalizeChordMark)
    .sort((a, b) => getMarkStart(a) - getMarkStart(b));

  if (chords.length === 0) {
    return line.lyrics;
  }

  const { lyrics } = line;
  let result = "";
  let cursor = 0;

  for (const mark of chords) {
    if (isTrailingChordMark(mark, lyrics.length)) {
      result += lyrics.slice(cursor);
      result += `[${mark.chord}]`;
      cursor = lyrics.length;
      continue;
    }

    const start = getMarkStart(mark);
    result += lyrics.slice(cursor, start);
    result += `[${mark.chord}]`;
    cursor = start;
  }

  result += lyrics.slice(cursor);
  return result;
}

export function sectionsToChordProText(sections: Section[]): string {
  return sections
    .map((section) => {
      const header = `{${section.label}}`;
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
