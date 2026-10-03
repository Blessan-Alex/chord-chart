import { createChordMark, getMarkEnd, getMarkStart, normalizeChordMark } from "@/lib/chordMarks";
import { graphemeBoundaries, graphemeRangeAt } from "@/lib/graphemeUtils";
import type { ChordMark, LyricLine } from "@/lib/types";

/**
 * A placeable position on a lyric line.
 *
 * `char` anchors a chord on a grapheme (highlight-a-syllable). `gap` anchors it
 * between graphemes — including before the first word and after the last one —
 * which is resolved against the lyric string at commit time, inserting a spacer
 * when there is no free whitespace to land on (same rule the ChordPro parser
 * uses for back-to-back `[A][B]` marks).
 */
export type PlacementSlot =
  | { kind: "char"; start: number; end: number }
  | { kind: "gap"; index: number };

export type GapZone = {
  /** Insertion index the zone places at. */
  index: number;
  /** End of the whitespace run (equals `index` for zero-width gaps). */
  endIndex: number;
  kind: "lineStart" | "between" | "lineEnd";
};

const SPACER = " ";
const MAX_QUICK_PICKS = 8;

function isSpace(char: string | undefined): boolean {
  return char !== undefined && /\s/u.test(char);
}

export function slotPosition(slot: PlacementSlot): number {
  return slot.kind === "char" ? slot.start : slot.index;
}

function sameSlot(a: PlacementSlot | null, b: PlacementSlot | null): boolean {
  if (!a || !b || a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "char" && b.kind === "char") {
    return a.start === b.start && a.end === b.end;
  }
  return slotPosition(a) === slotPosition(b);
}

/** Keep marks in reading order so edits stay diff-stable and round-trip exactly. */
function sortedByStart(chords: ChordMark[]): ChordMark[] {
  return [...chords].sort((a, b) => getMarkStart(a) - getMarkStart(b));
}

function occupiedStarts(chords: ChordMark[]): Set<number> {
  return new Set(chords.map((mark) => getMarkStart(normalizeChordMark(mark))));
}

/** Whitespace run covering `index`, or `null` when the position has no whitespace. */
function whitespaceRunAt(
  lyrics: string,
  index: number,
): { start: number; end: number } | null {
  const len = lyrics.length;
  let probe = index;

  if (probe >= len || !isSpace(lyrics[probe])) {
    // A caret sitting just past a run (e.g. end of line) still belongs to it.
    if (probe > 0 && isSpace(lyrics[probe - 1])) {
      probe -= 1;
    } else {
      return null;
    }
  }

  let start = probe;
  let end = probe + 1;
  while (start > 0 && isSpace(lyrics[start - 1])) {
    start -= 1;
  }
  while (end < len && isSpace(lyrics[end])) {
    end += 1;
  }

  return { start, end };
}

/** Where a click/caret at `offset` should place a chord. */
export function slotFromCaret(lyrics: string, offset: number): PlacementSlot {
  const len = lyrics.length;
  const clamped = Math.max(0, Math.min(offset, len));

  if (len === 0) {
    return { kind: "gap", index: 0 };
  }

  if (clamped >= len) {
    return { kind: "gap", index: len };
  }

  if (isSpace(lyrics[clamped])) {
    return { kind: "gap", index: clamped };
  }

  const { start, end } = graphemeRangeAt(lyrics, clamped);
  return { kind: "char", start, end };
}

/** Slot for a text selection, snapped to the grapheme range it covers. */
export function slotFromSelection(
  lyrics: string,
  start: number,
  end: number,
): PlacementSlot {
  if (end <= start) {
    return slotFromCaret(lyrics, start);
  }

  const selected = lyrics.slice(start, end);
  if (selected.trim() === "") {
    return { kind: "gap", index: start };
  }

  return { kind: "char", start, end };
}

/**
 * Every slot on the line in reading order — one per non-whitespace grapheme,
 * one per whitespace run, plus the line start and line end gaps.
 */
export function slotsForLine(line: LyricLine): PlacementSlot[] {
  const { lyrics } = line;
  const len = lyrics.length;
  const slots: PlacementSlot[] = [];

  if (len === 0) {
    return [{ kind: "gap", index: 0 }];
  }

  if (!isSpace(lyrics[0])) {
    slots.push({ kind: "gap", index: 0 });
  }

  const boundaries = graphemeBoundaries(lyrics, "en");
  let cursor = 0;

  while (cursor < len) {
    if (isSpace(lyrics[cursor])) {
      const run = whitespaceRunAt(lyrics, cursor);
      const runEnd = run?.end ?? cursor + 1;
      slots.push({ kind: "gap", index: cursor });
      cursor = runEnd;
      continue;
    }

    const nextBoundary = boundaries.find((boundary) => boundary > cursor) ?? cursor + 1;
    slots.push({ kind: "char", start: cursor, end: nextBoundary });
    cursor = nextBoundary;
  }

  if (!isSpace(lyrics[len - 1])) {
    slots.push({ kind: "gap", index: len });
  }

  return slots;
}

/** Gap positions worth rendering a hit target for. */
export function gapZonesForLine(line: LyricLine): GapZone[] {
  const { lyrics } = line;
  const len = lyrics.length;

  return slotsForLine(line)
    .filter((slot): slot is { kind: "gap"; index: number } => slot.kind === "gap")
    .map((slot) => {
      const run = slot.index < len ? whitespaceRunAt(lyrics, slot.index) : null;
      const endIndex = run ? run.end : slot.index;
      const kind: GapZone["kind"] =
        slot.index === 0 && !run
          ? "lineStart"
          : endIndex >= len
            ? "lineEnd"
            : "between";

      return { index: slot.index, endIndex, kind };
    });
}

/** Indices whose pixel offsets the editor needs in order to lay out gap zones. */
export function gapMeasurementIndices(line: LyricLine): number[] {
  const indices = new Set<number>();
  for (const zone of gapZonesForLine(line)) {
    indices.add(zone.index);
    indices.add(zone.endIndex);
  }
  return [...indices];
}

function shiftMarksForInsert(chords: ChordMark[], at: number): ChordMark[] {
  return chords.map((mark) => {
    const normalized = normalizeChordMark(mark);
    const start = getMarkStart(normalized);
    const end = getMarkEnd(normalized);

    return normalizeChordMark({
      chord: normalized.chord,
      start: start >= at ? start + 1 : start,
      end: end > at ? end + 1 : end,
    });
  });
}

function shiftMarksForDelete(chords: ChordMark[], at: number): ChordMark[] {
  return chords.map((mark) => {
    const normalized = normalizeChordMark(mark);
    const start = getMarkStart(normalized);
    const end = getMarkEnd(normalized);

    return normalizeChordMark({
      chord: normalized.chord,
      start: start > at ? start - 1 : start,
      end: end > at ? end - 1 : end,
    });
  });
}

/** Insert one spacer character, keeping every existing chord on its glyph. */
function insertSpacer(line: LyricLine, at: number): LyricLine {
  const clamped = Math.max(0, Math.min(at, line.lyrics.length));
  return {
    lyrics: `${line.lyrics.slice(0, clamped)}${SPACER}${line.lyrics.slice(clamped)}`,
    chords: shiftMarksForInsert(line.chords, clamped),
  };
}

/**
 * Resolve a gap to a concrete anchor: reuse a free space in the run when there
 * is one, otherwise insert a spacer so the new chord lands after the chords
 * already sitting in that gap.
 */
function resolveGapAnchor(
  line: LyricLine,
  index: number,
): { anchorIndex: number; insertAt: number | null } {
  const clamped = Math.max(0, Math.min(index, line.lyrics.length));
  const run = whitespaceRunAt(line.lyrics, clamped);

  if (!run) {
    return { anchorIndex: clamped, insertAt: clamped };
  }

  const occupied = occupiedStarts(line.chords);
  for (let i = run.start; i < run.end; i += 1) {
    if (!occupied.has(i)) {
      return { anchorIndex: i, insertAt: null };
    }
  }

  return { anchorIndex: run.end, insertAt: run.end };
}

export type AppliedPlacement = {
  line: LyricLine;
  /** Slot the chord actually landed on, after any spacer insertion. */
  slot: PlacementSlot;
};

/** Place (or replace) a chord at a slot. */
export function applyPlacement(
  line: LyricLine,
  slot: PlacementSlot,
  chord: string,
): AppliedPlacement {
  if (slot.kind === "char") {
    const chords = line.chords.map(normalizeChordMark);
    const existingIdx = chords.findIndex((mark) => getMarkStart(mark) === slot.start);
    const mark = createChordMark(chord, slot.start, slot.end);

    if (existingIdx >= 0) {
      chords[existingIdx] = mark;
    } else {
      chords.push(mark);
    }

    return { line: { lyrics: line.lyrics, chords: sortedByStart(chords) }, slot };
  }

  const { anchorIndex, insertAt } = resolveGapAnchor(line, slot.index);
  const base = insertAt === null ? line : insertSpacer(line, insertAt);
  const chords = base.chords.map(normalizeChordMark);
  const existingIdx = chords.findIndex((mark) => getMarkStart(mark) === anchorIndex);
  const mark = createChordMark(chord, anchorIndex, anchorIndex + 1);

  if (existingIdx >= 0) {
    chords[existingIdx] = mark;
  } else {
    chords.push(mark);
  }

  return {
    line: { lyrics: base.lyrics, chords: sortedByStart(chords) },
    slot: { kind: "char", start: anchorIndex, end: anchorIndex + 1 },
  };
}

/** True when a spacer can go away without gluing two words together. */
export function isRemovableSpacer(lyrics: string, index: number): boolean {
  if (!isSpace(lyrics[index])) {
    return false;
  }

  const atLineStart = index === 0;
  const atLineEnd = index === lyrics.length - 1;
  return (
    atLineStart || atLineEnd || isSpace(lyrics[index - 1]) || isSpace(lyrics[index + 1])
  );
}

/** Remove the chord anchored at `start`, cleaning up its spacer when safe. */
export function removePlacementAt(line: LyricLine, start: number): LyricLine {
  const kept = line.chords
    .map(normalizeChordMark)
    .filter((mark) => getMarkStart(mark) !== start);

  if (kept.length === line.chords.length) {
    return { lyrics: line.lyrics, chords: kept };
  }

  if (!isRemovableSpacer(line.lyrics, start)) {
    return { lyrics: line.lyrics, chords: kept };
  }

  const stillOccupied = kept.some((mark) => getMarkStart(mark) === start);
  if (stillOccupied) {
    return { lyrics: line.lyrics, chords: kept };
  }

  return {
    lyrics: `${line.lyrics.slice(0, start)}${line.lyrics.slice(start + 1)}`,
    chords: shiftMarksForDelete(kept, start),
  };
}

export function findChordAtSlot(
  line: LyricLine,
  slot: PlacementSlot,
): ChordMark | undefined {
  if (slot.kind !== "char") {
    return undefined;
  }
  return line.chords
    .map(normalizeChordMark)
    .find((mark) => getMarkStart(mark) === slot.start);
}

function slotIndexIn(slots: PlacementSlot[], slot: PlacementSlot): number {
  const exact = slots.findIndex((candidate) => sameSlot(candidate, slot));
  if (exact >= 0) {
    return exact;
  }

  const position = slotPosition(slot);
  const nearest = slots.findIndex((candidate) => slotPosition(candidate) >= position);
  return nearest >= 0 ? nearest : slots.length - 1;
}

function stepSlot(
  line: LyricLine,
  slot: PlacementSlot,
  direction: 1 | -1,
): PlacementSlot {
  const slots = slotsForLine(line);
  const current = slotIndexIn(slots, slot);
  const next = current + direction;

  if (next < 0 || next >= slots.length) {
    return slots[current] ?? slot;
  }

  return slots[next]!;
}

export function nextSlot(line: LyricLine, slot: PlacementSlot): PlacementSlot {
  return stepSlot(line, slot, 1);
}

export function prevSlot(line: LyricLine, slot: PlacementSlot): PlacementSlot {
  return stepSlot(line, slot, -1);
}

function wordBefore(lyrics: string, index: number): string {
  let end = index;
  while (end > 0 && isSpace(lyrics[end - 1])) {
    end -= 1;
  }
  let start = end;
  while (start > 0 && !isSpace(lyrics[start - 1])) {
    start -= 1;
  }
  return lyrics.slice(start, end);
}

function wordAfter(lyrics: string, index: number): string {
  let start = index;
  while (start < lyrics.length && isSpace(lyrics[start])) {
    start += 1;
  }
  let end = start;
  while (end < lyrics.length && !isSpace(lyrics[end])) {
    end += 1;
  }
  return lyrics.slice(start, end);
}

/** Plain-language target, e.g. `Gap · between “little” and “star”`. */
export function describeSlot(line: LyricLine, slot: PlacementSlot): string {
  const { lyrics } = line;

  if (lyrics.trim() === "") {
    return "Chords only · empty line";
  }

  if (slot.kind === "char") {
    const text = lyrics.slice(slot.start, slot.end);
    if (text.trim() === "") {
      const before = wordBefore(lyrics, slot.start);
      return before ? `Gap · after “${before}”` : "Gap · start of line";
    }
    return `On “${text}” in “${wordAt(lyrics, slot.start)}”`;
  }

  const atLineEnd = slot.index >= lyrics.trimEnd().length;
  const before = wordBefore(lyrics, slot.index);
  const after = wordAfter(lyrics, slot.index);

  if (!before) {
    return after ? `Gap · before “${after}”` : "Gap · start of line";
  }
  if (atLineEnd || !after) {
    return `End of line · after “${before}”`;
  }
  return `Gap · between “${before}” and “${after}”`;
}

function wordAt(lyrics: string, index: number): string {
  let start = index;
  let end = index;
  while (start > 0 && !isSpace(lyrics[start - 1])) {
    start -= 1;
  }
  while (end < lyrics.length && !isSpace(lyrics[end])) {
    end += 1;
  }
  return lyrics.slice(start, end);
}

/** Most-used chords in the song — fuels the quick picks. */
export function chordsUsedIn(lines: LyricLine[]): string[] {
  const seen = new Map<string, number>();

  for (const line of lines) {
    for (const mark of line.chords) {
      const chord = normalizeChordMark(mark).chord.trim();
      if (chord) {
        seen.set(chord, (seen.get(chord) ?? 0) + 1);
      }
    }
  }

  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_QUICK_PICKS)
    .map(([chord]) => chord);
}
