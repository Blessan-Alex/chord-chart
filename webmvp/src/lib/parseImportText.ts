import { parseChordProSections } from "./chordProParser";
import type { Section } from "./types";

/** Admin import: always ChordPro (`{sections}` + `[chords]`). */
export function parseImportText(raw: string): Section[] {
  return parseChordProSections(raw);
}
