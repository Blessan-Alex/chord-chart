import { parseChordProSections } from "./chordProParser";
import { parseRawLyrics } from "./editorParser";
import type { Section } from "./types";

const SECTION_LABEL_RE =
  /^(verse|chorus|bridge|intro|outro|tag|pre-chorus|instrumental|hook|refrain|breakdown|interlude|section)(\s+\d+)?$/i;

/** Inline ChordPro chord token (not a section header line). */
const INLINE_CHORD_RE =
  /\[[A-Ga-g][#b♯♭]?(?:m|maj|min|sus|add|dim|aug|M)?[\d/]*\]/;

function isSectionHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  const bracketMatch = trimmed.match(/^\[(.+)\]$/);
  if (bracketMatch) {
    return true;
  }

  const colonMatch = trimmed.match(/^(.*?):$/);
  if (!colonMatch) {
    return false;
  }

  return SECTION_LABEL_RE.test(colonMatch[1].trim());
}

/** True when paste contains inline chord brackets on lyric lines. */
export function looksLikeChordPro(raw: string): boolean {
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isSectionHeaderLine(trimmed)) {
      continue;
    }

    if (INLINE_CHORD_RE.test(trimmed)) {
      return true;
    }
  }

  return false;
}

export function parseImportText(raw: string): Section[] {
  if (looksLikeChordPro(raw)) {
    return parseChordProSections(raw);
  }

  return parseRawLyrics(raw);
}
