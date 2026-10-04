import { sectionsToChordProText } from "./chordProParser";
import { hasComposerLyrics } from "./composerGates";
import { parseFlexibleLyricSource } from "./flexibleLyricParser";
import type { Section } from "./types";

export function sectionsSignature(sections: Section[]): string {
  return JSON.stringify(sections);
}

function flushChordSourceToSections(sourceText: string): Section[] {
  return parseFlexibleLyricSource(sourceText);
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
    if (!hasComposerLyrics(sections)) {
      return { ok: false, error: "Add a title and at least one lyric line." };
    }
    return { ok: true, sections };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not parse chord source.",
    };
  }
}
