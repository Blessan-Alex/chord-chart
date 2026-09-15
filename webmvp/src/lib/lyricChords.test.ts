import { describe, expect, it } from "vitest";

import {
  lyricChordStarts,
  lyricChordsSignature,
  normalizeLyricChords,
} from "@/lib/lyricChords";

describe("lyricChords", () => {
  it("builds a stable signature for chord rows", () => {
    const chords = [
      { chord: "F", start: 0, end: 1 },
      { chord: "G", start: 5, end: 6 },
    ];
    expect(lyricChordsSignature(chords)).toBe("F@0-1|G@5-6");
  });

  it("extracts chord start indices", () => {
    expect(lyricChordStarts([{ chord: "C", position: 3 }])).toEqual([3]);
  });

  it("normalizes legacy position marks", () => {
    expect(normalizeLyricChords([{ chord: "Am", position: 2 }])[0]).toEqual({
      chord: "Am",
      start: 2,
      end: 3,
    });
  });
});
