import { describe, expect, it } from "vitest";

import {
  applyPlacement,
  describeSlot,
  findChordAtSlot,
  gapPreviewAnchor,
  gapZonesForLine,
  isRemovableSpacer,
  prepareGapPlacement,
  rewindPreparedGapSpacer,
  nextSlot,
  prevSlot,
  removePlacementAt,
  slotFromCaret,
  slotFromSelection,
  slotsForLine,
  type PlacementSlot,
} from "./chordPlacement";
import { parseChordProLine, serializeChordProLine } from "./chordProParser";
import type { LyricLine } from "./types";

function line(lyrics: string, chords: LyricLine["chords"] = []): LyricLine {
  return { lyrics, chords };
}

const gap = (index: number): PlacementSlot => ({ kind: "gap", index });

/** Place several chords in sequence, re-resolving the slot each time. */
function placeAll(
  start: LyricLine,
  placements: { slot: PlacementSlot; chord: string }[],
): LyricLine {
  return placements.reduce(
    (current, { slot, chord }) => applyPlacement(current, slot, chord).line,
    start,
  );
}

describe("slotFromCaret", () => {
  it("resolves a caret on a letter to that grapheme", () => {
    expect(slotFromCaret("little star", 4)).toEqual({
      kind: "char",
      start: 4,
      end: 5,
    });
  });

  it("resolves a caret on a space to a gap", () => {
    expect(slotFromCaret("little star", 6)).toEqual({ kind: "gap", index: 6 });
  });

  it("resolves a caret past the last character to the end-of-line gap", () => {
    expect(slotFromCaret("star", 4)).toEqual({ kind: "gap", index: 4 });
    expect(slotFromCaret("star", 99)).toEqual({ kind: "gap", index: 4 });
  });

  it("treats an empty line as a single gap", () => {
    expect(slotFromCaret("", 0)).toEqual({ kind: "gap", index: 0 });
  });
});

describe("slotFromSelection", () => {
  it("keeps a highlighted syllable as a char slot", () => {
    expect(slotFromSelection("little star", 0, 4)).toEqual({
      kind: "char",
      start: 0,
      end: 4,
    });
  });

  it("converts a whitespace-only highlight to a gap", () => {
    expect(slotFromSelection("little star", 6, 7)).toEqual({
      kind: "gap",
      index: 6,
    });
  });
});

describe("slotsForLine", () => {
  it("lists line start, graphemes, whitespace runs and line end", () => {
    expect(slotsForLine(line("ab c"))).toEqual([
      { kind: "gap", index: 0 },
      { kind: "char", start: 0, end: 1 },
      { kind: "char", start: 1, end: 2 },
      { kind: "gap", index: 2 },
      { kind: "char", start: 3, end: 4 },
      { kind: "gap", index: 4 },
    ]);
  });

  it("collapses a multi-space run into one slot", () => {
    const slots = slotsForLine(line("a   b"));
    expect(slots.filter((slot) => slot.kind === "gap")).toEqual([
      { kind: "gap", index: 0 },
      { kind: "gap", index: 1 },
      { kind: "gap", index: 5 },
    ]);
  });
});

describe("gapZonesForLine", () => {
  it("reports run extents so the editor can size hit targets", () => {
    expect(gapZonesForLine(line("a   b"))).toEqual([
      { index: 0, endIndex: 0, kind: "lineStart" },
      { index: 1, endIndex: 4, kind: "between" },
      { index: 5, endIndex: 5, kind: "lineEnd" },
    ]);
  });
});

describe("applyPlacement — char slots", () => {
  it("anchors a chord on a highlighted syllable", () => {
    const result = applyPlacement(line("little star"), { kind: "char", start: 4, end: 6 }, "C");
    expect(result.line.lyrics).toBe("little star");
    expect(result.line.chords).toEqual([{ chord: "C", start: 4, end: 6 }]);
  });

  it("replaces the chord already on that slot", () => {
    const start = line("little", [{ chord: "C", start: 0, end: 1 }]);
    const result = applyPlacement(start, { kind: "char", start: 0, end: 1 }, "G");
    expect(result.line.chords).toEqual([{ chord: "G", start: 0, end: 1 }]);
  });
});

describe("prepareGapPlacement", () => {
  it("maps a free space in the gap to a char slot without changing lyrics", () => {
    const result = prepareGapPlacement(line("Twinkle Twinkle"), 7);
    expect(result.line.lyrics).toBe("Twinkle Twinkle");
    expect(result.slot).toEqual({ kind: "char", start: 7, end: 8 });
    expect(result.preparedSpacerAt).toBeNull();
  });

  it("inserts a spacer when the gap already has a chord", () => {
    const withC = applyPlacement(line("Twinkle Twinkle"), gap(7), "C").line;
    const result = prepareGapPlacement(withC, 7);

    expect(result.line.lyrics).toBe("Twinkle   Twinkle");
    expect(result.slot).toEqual({ kind: "char", start: 8, end: 9 });
    expect(result.preparedSpacerAt).toBe(8);
    expect(result.preparedSpacerCount).toBe(2);
    expect(gapPreviewAnchor(withC, 7)).toBe(8);
  });

  it("rewinds a preview spacer when placement is cancelled", () => {
    const prepared = prepareGapPlacement(
      applyPlacement(line("Twinkle Twinkle"), gap(7), "C").line,
      7,
    );
    const rewound = rewindPreparedGapSpacer(
      prepared.line,
      prepared.preparedSpacerAt!,
      prepared.preparedSpacerCount,
    );
    expect(rewound.lyrics).toBe("Twinkle Twinkle");
    expect(rewound.chords).toEqual([{ chord: "C", start: 7, end: 8 }]);
  });
});

describe("applyPlacement — gaps between words", () => {
  it("reuses the existing space without touching the lyrics", () => {
    const result = applyPlacement(line("little star"), gap(6), "C");
    expect(result.line.lyrics).toBe("little star");
    expect(result.line.chords).toEqual([{ chord: "C", start: 6, end: 7 }]);
  });

  it("adds a spacer for a second chord in the same gap, to the right of the first", () => {
    const result = placeAll(line("little star"), [
      { slot: gap(6), chord: "C" },
      { slot: gap(6), chord: "G" },
    ]);

    expect(result.lyrics).toBe("little   star");
    expect(result.chords).toEqual([
      { chord: "C", start: 6, end: 7 },
      { chord: "G", start: 7, end: 8 },
    ]);
  });

  it("keeps stacking chords in click order", () => {
    const result = placeAll(line("little star"), [
      { slot: gap(6), chord: "C" },
      { slot: gap(6), chord: "G" },
      { slot: gap(6), chord: "Am" },
    ]);

    expect(result.lyrics).toBe("little   star");
    expect(result.chords.map((mark) => mark.chord)).toEqual(["C", "G", "Am"]);
    expect(result.chords.map((mark) => mark.start)).toEqual([6, 7, 8]);
  });

  it("resolves a gap addressed from the far side of the space to the same anchor", () => {
    const result = applyPlacement(line("little star"), gap(7), "C");
    expect(result.line.lyrics).toBe("little star");
    expect(result.line.chords).toEqual([{ chord: "C", start: 6, end: 7 }]);
  });
});

describe("applyPlacement — end of line", () => {
  it("appends a spacer when the line has no trailing space", () => {
    const result = applyPlacement(line("star"), gap(4), "C");
    expect(result.line.lyrics).toBe("star ");
    expect(result.line.chords).toEqual([{ chord: "C", start: 4, end: 5 }]);
  });

  it("supports several chords after the last word", () => {
    const result = placeAll(line("Twinkle twinkle little star"), [
      { slot: gap(27), chord: "C" },
      { slot: gap(27), chord: "G" },
    ]);

    expect(result.lyrics).toBe("Twinkle twinkle little star   ");
    expect(result.chords.map((mark) => mark.start)).toEqual([27, 28]);
  });
});

describe("applyPlacement — before the first word", () => {
  it("inserts leading spacers for chords ahead of the lyric", () => {
    const result = placeAll(line("How i wonder"), [
      { slot: gap(0), chord: "C" },
      { slot: gap(0), chord: "G" },
    ]);

    expect(result.lyrics).toBe("   How i wonder");
    expect(result.chords).toEqual([
      { chord: "C", start: 0, end: 1 },
      { chord: "G", start: 1, end: 2 },
    ]);
  });

  it("shifts chords already on the line when inserting at the start", () => {
    const start = line("How", [{ chord: "Am", start: 0, end: 1 }]);
    const result = applyPlacement(start, gap(0), "C");

    expect(result.line.lyrics).toBe(" How");
    expect(result.line.chords).toEqual([
      { chord: "C", start: 0, end: 1 },
      { chord: "Am", start: 1, end: 2 },
    ]);
  });
});

describe("mark ordering", () => {
  it("keeps marks sorted by position regardless of placement order", () => {
    const result = placeAll(line("Twinkle twinkle little star"), [
      { slot: gap(27), chord: "F" },
      { slot: { kind: "char", start: 0, end: 1 }, chord: "C" },
      { slot: gap(7), chord: "Am" },
    ]);

    expect(result.chords.map((mark) => mark.start)).toEqual([0, 7, 27]);
  });

  it("survives a ChordPro round-trip unchanged, field order included", () => {
    const placed = placeAll(line("little star"), [
      { slot: gap(6), chord: "G" },
      { slot: { kind: "char", start: 0, end: 1 }, chord: "C" },
    ]);

    const reparsed = parseChordProLine(serializeChordProLine(placed));
    expect(reparsed).toEqual(placed);
  });
});

describe("ChordPro round-trip", () => {
  it("round-trips chords stacked in a gap", () => {
    const placed = placeAll(line("little star"), [
      { slot: gap(6), chord: "C" },
      { slot: gap(6), chord: "G" },
    ]);

    const text = serializeChordProLine(placed);
    const reparsed = parseChordProLine(text);

    expect(reparsed.lyrics).toBe(placed.lyrics);
    expect(reparsed.chords).toEqual(placed.chords);
  });

  it("round-trips chords at the end of a line", () => {
    const placed = placeAll(line("star"), [
      { slot: gap(4), chord: "C" },
      { slot: gap(4), chord: "G" },
    ]);

    const reparsed = parseChordProLine(serializeChordProLine(placed));
    expect(reparsed.lyrics).toBe(placed.lyrics);
    expect(reparsed.chords.map((mark) => mark.chord)).toEqual(["C", "G"]);
  });

  it("round-trips chords before the first word", () => {
    const placed = placeAll(line("How i wonder"), [
      { slot: gap(0), chord: "C" },
      { slot: gap(0), chord: "G" },
    ]);

    const reparsed = parseChordProLine(serializeChordProLine(placed));
    expect(reparsed.lyrics).toBe(placed.lyrics);
    expect(reparsed.chords).toEqual(placed.chords);
  });

  it("keeps marks inside the lyric bounds", () => {
    const placed = placeAll(line("Twinkle twinkle little star"), [
      { slot: { kind: "char", start: 16, end: 17 }, chord: "C" },
      { slot: gap(27), chord: "G" },
      { slot: gap(27), chord: "Am" },
    ]);

    for (const mark of placed.chords) {
      expect(mark.start).toBeLessThan(placed.lyrics.length);
      expect(mark.end).toBeLessThanOrEqual(placed.lyrics.length);
    }
  });
});

describe("removePlacementAt", () => {
  it("removes a spacer along with its chord", () => {
    const placed = placeAll(line("little star"), [
      { slot: gap(6), chord: "C" },
      { slot: gap(6), chord: "G" },
    ]);

    const result = removePlacementAt(placed, 7);
    expect(result.lyrics).toBe("little  star");
    expect(result.chords).toEqual([{ chord: "C", start: 6, end: 7 }]);
  });

  it("keeps a real word separator when its chord is removed", () => {
    const placed = applyPlacement(line("little star"), gap(6), "C").line;
    const result = removePlacementAt(placed, 6);

    expect(result.lyrics).toBe("little star");
    expect(result.chords).toEqual([]);
  });

  it("removes a trailing spacer", () => {
    const placed = applyPlacement(line("star"), gap(4), "C").line;
    expect(removePlacementAt(placed, 4)).toEqual({ lyrics: "star", chords: [] });
  });

  it("leaves chords on letters alone", () => {
    const placed = applyPlacement(line("star"), { kind: "char", start: 0, end: 1 }, "C").line;
    expect(removePlacementAt(placed, 0)).toEqual({ lyrics: "star", chords: [] });
  });
});

describe("isRemovableSpacer", () => {
  it("accepts doubled, leading and trailing spaces", () => {
    expect(isRemovableSpacer("a  b", 1)).toBe(true);
    expect(isRemovableSpacer(" ab", 0)).toBe(true);
    expect(isRemovableSpacer("ab ", 2)).toBe(true);
  });

  it("rejects a single separator between words", () => {
    expect(isRemovableSpacer("a b", 1)).toBe(false);
  });

  it("rejects non-space positions", () => {
    expect(isRemovableSpacer("ab", 0)).toBe(false);
  });
});

describe("nextSlot / prevSlot", () => {
  it("walks forward through gaps and graphemes", () => {
    const target = line("ab c");
    expect(nextSlot(target, { kind: "gap", index: 0 })).toEqual({
      kind: "char",
      start: 0,
      end: 1,
    });
    expect(nextSlot(target, { kind: "char", start: 1, end: 2 })).toEqual({
      kind: "gap",
      index: 2,
    });
  });

  it("stops at the line end", () => {
    const target = line("ab");
    expect(nextSlot(target, { kind: "gap", index: 2 })).toEqual({
      kind: "gap",
      index: 2,
    });
  });

  it("walks backward", () => {
    const target = line("ab c");
    expect(prevSlot(target, { kind: "char", start: 3, end: 4 })).toEqual({
      kind: "gap",
      index: 2,
    });
  });
});

describe("describeSlot", () => {
  it("names the words around a gap", () => {
    expect(describeSlot(line("little star"), gap(6))).toBe(
      "Gap · between “little” and “star”",
    );
  });

  it("names the end of a line", () => {
    expect(describeSlot(line("little star"), gap(11))).toBe(
      "End of line · after “star”",
    );
  });

  it("names the start of a line", () => {
    expect(describeSlot(line("How i wonder"), gap(0))).toBe("Gap · before “How”");
  });

  it("names a syllable inside its word", () => {
    expect(describeSlot(line("little star"), { kind: "char", start: 4, end: 6 })).toBe(
      "On “le” in “little”",
    );
  });
});

describe("findChordAtSlot", () => {
  it("finds the chord on a char slot", () => {
    const target = line("star", [{ chord: "C", start: 0, end: 1 }]);
    expect(findChordAtSlot(target, { kind: "char", start: 0, end: 1 })?.chord).toBe("C");
  });

  it("treats gap slots as empty, since they resolve to a free anchor", () => {
    const target = line("a b", [{ chord: "C", start: 1, end: 2 }]);
    expect(findChordAtSlot(target, gap(1))).toBeUndefined();
  });
});
