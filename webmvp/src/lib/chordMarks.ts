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

export function normalizeLyricLine(line: LyricLine): LyricLine {
  return {
    lyrics: line.lyrics,
    chords: line.chords.map(normalizeChordMark),
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
