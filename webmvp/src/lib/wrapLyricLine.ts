import { getMarkStart, normalizeChordMark } from "@/lib/chordMarks";
import type { ChordMark, LyricLine } from "@/lib/types";

export type WrappedSegment = {
  lyrics: string;
  chords: ChordMark[];
};

/** Approximate monospace character width as a ratio of font size. */
export const MONO_CHAR_WIDTH_RATIO = 0.602;

export function charsPerLine(containerWidth: number, fontSize: number): number {
  if (containerWidth <= 0 || fontSize <= 0) {
    return 32;
  }
  return Math.max(12, Math.floor(containerWidth / (fontSize * MONO_CHAR_WIDTH_RATIO)));
}

function chordsForSegment(
  chords: ChordMark[],
  segStart: number,
  segEnd: number,
): ChordMark[] {
  return chords
    .filter((chord) => {
      const start = getMarkStart(chord);
      return start >= segStart && start < segEnd;
    })
    .map((chord) =>
      normalizeChordMark({
        ...chord,
        start: getMarkStart(chord) - segStart,
        end: getMarkStart(chord) - segStart + 1,
      }),
    );
}

export function wrapLyricLine(line: LyricLine, maxChars: number): WrappedSegment[] {
  const text = line.lyrics;
  const normalizedChords = line.chords.map(normalizeChordMark);

  if (maxChars <= 0 || text.length <= maxChars) {
    return [
      {
        lyrics: text,
        chords: normalizedChords,
      },
    ];
  }

  const segments: WrappedSegment[] = [];
  let offset = 0;

  while (offset < text.length) {
    const remaining = text.length - offset;
    if (remaining <= maxChars) {
      segments.push({
        lyrics: text.slice(offset),
        chords: chordsForSegment(normalizedChords, offset, text.length),
      });
      break;
    }

    let chunkLen = maxChars;
    let chunk = text.slice(offset, offset + chunkLen);

    if (offset + chunkLen < text.length && !/\s/.test(text[offset + chunkLen] ?? "")) {
      const lastSpace = chunk.lastIndexOf(" ");
      if (lastSpace > 0) {
        chunkLen = lastSpace;
        chunk = text.slice(offset, offset + chunkLen);
      }
    }

    segments.push({
      lyrics: chunk,
      chords: chordsForSegment(normalizedChords, offset, offset + chunkLen),
    });

    offset += chunkLen;
    while (offset < text.length && text[offset] === " ") {
      offset += 1;
    }
  }

  return segments.length > 0
    ? segments
    : [{ lyrics: text, chords: normalizedChords }];
}
