import { measureLyricCharOffset } from "@/lib/lyricMeasurement";

/**
 * Nearest string index (0…length) for a pointer X, using measured glyph boundaries.
 * Works for proportional fonts and Indic scripts when the lyric element is laid out.
 */
export function caretIndexFromPointer(
  element: HTMLElement,
  clientX: number,
  lyricsLength: number,
): number {
  if (lyricsLength <= 0) {
    return 0;
  }

  const rect = element.getBoundingClientRect();
  const localX = clientX - rect.left;

  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let index = 0; index <= lyricsLength; index += 1) {
    const offset = measureLyricCharOffset(element, index);
    if (offset === null) {
      continue;
    }
    const distance = Math.abs(localX - offset);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}
