import { getMarkStart, normalizeChordMark } from "@/lib/chordMarks";
import type { ChordMark, LyricLine } from "@/lib/types";

/** Stable signature for memoizing normalized chord rows. */
export function lyricChordsSignature(chords: LyricLine["chords"]): string {
  return chords
    .map((mark) => {
      const normalized = normalizeChordMark(mark);
      return `${normalized.chord}@${normalized.start}-${normalized.end}`;
    })
    .join("|");
}

export function lyricChordStarts(chords: LyricLine["chords"]): number[] {
  return chords.map((mark) => getMarkStart(normalizeChordMark(mark)));
}

export function normalizeLyricChords(chords: LyricLine["chords"]): ChordMark[] {
  return chords.map(normalizeChordMark);
}
