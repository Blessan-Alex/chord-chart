import { describe, expect, it } from "vitest";

import {
  createChordMark,
  getMarkEnd,
  getMarkStart,
  normalizeChordMark,
  normalizeSections,
  serializeSectionsForPublish,
} from "./chordMarks";
import type { ChordMark } from "./types";

describe("chordMarks", () => {
  it("maps legacy position to start/end", () => {
    const mark: ChordMark = { chord: "G", position: 4 };
    expect(normalizeChordMark(mark)).toEqual({
      chord: "G",
      start: 4,
      end: 5,
    });
  });

  it("preserves explicit start/end", () => {
    const mark = createChordMark("Am7", 3, 7);
    expect(getMarkStart(mark)).toBe(3);
    expect(getMarkEnd(mark)).toBe(7);
  });

  it("normalizes sections on read", () => {
    const sections = normalizeSections([
      {
        label: "Verse 1",
        lines: [
          {
            lyrics: "Hello world",
            chords: [{ chord: "C", position: 0 }],
          },
        ],
      },
    ]);

    expect(sections[0]?.lines[0]?.chords[0]).toEqual({
      chord: "C",
      start: 0,
      end: 1,
    });
  });

  it("strips legacy position on publish", () => {
    const sections = serializeSectionsForPublish([
      {
        label: "Verse 1",
        lines: [
          {
            lyrics: "Hello world",
            chords: [{ chord: "C", position: 0, start: 0, end: 1 }],
          },
        ],
      },
    ]);

    expect(sections[0]?.lines[0]?.chords[0]).toEqual({
      chord: "C",
      start: 0,
      end: 1,
    });
    expect(sections[0]?.lines[0]?.chords[0]).not.toHaveProperty("position");
  });
});
