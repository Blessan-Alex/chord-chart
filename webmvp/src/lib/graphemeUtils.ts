type SegmenterLike = {
  segment(input: string): Iterable<{ index: number; segment: string }>;
};

function getSegmenter(locale = "en"): SegmenterLike | null {
  if (typeof Intl === "undefined" || !("Segmenter" in Intl)) {
    return null;
  }

  try {
    return new Intl.Segmenter(locale, { granularity: "grapheme" });
  } catch {
    return null;
  }
}

/** Expand a string into grapheme clusters (falls back to code points). */
export function splitGraphemes(text: string, locale = "en"): string[] {
  const segmenter = getSegmenter(locale);
  if (!segmenter) {
    return [...text];
  }

  return [...segmenter.segment(text)].map((part) => part.segment);
}

/** Map grapheme index boundaries to string offsets. */
export function graphemeBoundaries(text: string, locale = "en"): number[] {
  const segmenter = getSegmenter(locale);
  if (!segmenter) {
    const boundaries = [0];
    for (let i = 0; i < text.length; i += 1) {
      boundaries.push(i + 1);
    }
    return boundaries;
  }

  const boundaries = [0];
  for (const part of segmenter.segment(text)) {
    boundaries.push(part.index + part.segment.length);
  }
  return boundaries;
}

function nearestBoundary(boundaries: number[], index: number, mode: "floor" | "ceil"): number {
  if (boundaries.length === 0) {
    return 0;
  }

  if (mode === "floor") {
    let result = 0;
    for (const boundary of boundaries) {
      if (boundary > index) {
        break;
      }
      result = boundary;
    }
    return result;
  }

  for (const boundary of boundaries) {
    if (boundary >= index) {
      return boundary;
    }
  }

  return boundaries[boundaries.length - 1] ?? 0;
}

/** Snap selection to full grapheme clusters. */
export function snapRangeToGraphemes(
  text: string,
  start: number,
  end: number,
  locale = "en",
): { start: number; end: number } {
  if (!text || end <= start) {
    return { start, end };
  }

  const boundaries = graphemeBoundaries(text, locale);
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));

  const snappedStart = nearestBoundary(boundaries, safeStart, "floor");
  const snappedEnd = nearestBoundary(boundaries, safeEnd, "ceil");

  if (snappedEnd <= snappedStart) {
    const nextEnd = boundaries.find((boundary) => boundary > snappedStart);
    return {
      start: snappedStart,
      end: nextEnd ?? Math.min(snappedStart + 1, text.length),
    };
  }

  return { start: snappedStart, end: snappedEnd };
}

/** Grapheme cluster containing `index`, or empty range at end of text. */
export function graphemeRangeAt(
  text: string,
  index: number,
  locale = "en",
): { start: number; end: number } {
  if (!text) {
    return { start: 0, end: 0 };
  }

  const clamped = Math.max(0, Math.min(index, text.length));
  const boundaries = graphemeBoundaries(text, locale);
  const start = nearestBoundary(boundaries, clamped, "floor");
  const end = nearestBoundary(boundaries, clamped + 1, "ceil");

  if (end <= start) {
    return { start: clamped, end: Math.min(clamped + 1, text.length) };
  }

  return { start, end };
}
