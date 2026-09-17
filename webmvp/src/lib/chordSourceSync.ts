import {
  parseChordProSections,
  sectionsToChordProText,
} from "./chordProParser";
import type { Section } from "./types";

export function sectionsSignature(sections: Section[]): string {
  return JSON.stringify(sections);
}

function flushChordSourceToSections(sourceText: string): Section[] {
  return parseChordProSections(sourceText);
}

export function syncSourceTextFromSections(sections: Section[]): string {
  return sectionsToChordProText(sections);
}

export type FlushResult =
  | { ok: true; sections: Section[] }
  | { ok: false; error: string };

export function tryFlushChordSource(sourceText: string): FlushResult {
  try {
    const sections = flushChordSourceToSections(sourceText);
    if (sections.every((section) => section.lines.length === 0)) {
      return { ok: false, error: "Add at least one lyric line." };
    }
    return { ok: true, sections };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not parse chord source.",
    };
  }
}
