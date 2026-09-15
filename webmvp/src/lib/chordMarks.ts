import type { ChordMark, LyricLine, Section } from "@/lib/types";

export function getMarkStart(mark: ChordMark): number {
  if (typeof mark.start === "number") {
    return mark.start;
  }
  return mark.position ?? 0;
}

export function getMarkEnd(mark: ChordMark): number {
  if (typeof mark.end === "number") {
    return mark.end;
  }
  const start = getMarkStart(mark);
  return start + 1;
}

export function normalizeChordMark(mark: ChordMark): ChordMark {
  const start = getMarkStart(mark);
  const end = Math.max(getMarkEnd(mark), start + 1);
  return {
    chord: mark.chord,
    start,
    end,
  };
}

/** Keep start/end within `[0, lyrics.length]` (fixes trailing ChordPro marks and bad data). */
export function clampChordMarkToLyrics(
  mark: ChordMark,
  lyricLength: number,
): ChordMark {
  const normalized = normalizeChordMark(mark);

  if (lyricLength <= 0) {
    return { chord: normalized.chord, start: 0, end: 1 };
  }

  let { start, end } = normalized;

  if (end > lyricLength) {
    if (start >= lyricLength) {
      start = lyricLength - 1;
      end = lyricLength;
    } else {
      end = lyricLength;
    }
  }

  if (start > lyricLength) {
    start = Math.max(0, lyricLength - 1);
  }

  if (start >= end) {
    end = Math.min(start + 1, lyricLength);
  }

  return normalizeChordMark({ chord: normalized.chord, start, end });
}

export function normalizeLyricLine(line: LyricLine): LyricLine {
  const lyricLength = line.lyrics.length;
  return {
    lyrics: line.lyrics,
    chords: line.chords.map((mark) =>
      clampChordMarkToLyrics(normalizeChordMark(mark), lyricLength),
    ),
  };
}

export function normalizeSections(sections: Section[]): Section[] {
  return sections.map((section) => ({
    ...section,
    lines: section.lines.map(normalizeLyricLine),
  }));
}

export function serializeChordMarkForPublish(mark: ChordMark): ChordMark {
  const normalized = normalizeChordMark(mark);
  return {
    chord: normalized.chord,
    start: normalized.start,
    end: normalized.end,
  };
}

export function serializeSectionsForPublish(sections: Section[]): Section[] {
  return sections.map((section) => ({
    ...section,
    lines: section.lines.map((line) => ({
      lyrics: line.lyrics,
      chords: line.chords.map(serializeChordMarkForPublish),
    })),
  }));
}

export function createChordMark(
  chord: string,
  start: number,
  end: number,
): ChordMark {
  return normalizeChordMark({
    chord,
    start,
    end: Math.max(end, start + 1),
  });
}

export function markKey(mark: ChordMark): string {
  const normalized = normalizeChordMark(mark);
  return `${normalized.start}:${normalized.end}:${normalized.chord}`;
}
