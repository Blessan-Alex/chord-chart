import { describe, expect, it } from "vitest";

import { charsPerLine, wrapLyricLine } from "@/lib/wrapLyricLine";
import type { LyricLine } from "@/lib/types";

describe("wrapLyricLine", () => {
  it("returns single segment when line fits", () => {
    const line: LyricLine = {
      lyrics: "Short line",
      chords: [{ chord: "C", start: 0, end: 1 }],
    };
    expect(wrapLyricLine(line, 40)).toEqual([
      { lyrics: "Short line", chords: [{ chord: "C", start: 0, end: 1 }] },
    ]);
  });

  it("accepts legacy position marks", () => {
    const line: LyricLine = {
      lyrics: "Short line",
      chords: [{ chord: "C", position: 0 }],
    };
    expect(wrapLyricLine(line, 40)).toEqual([
      { lyrics: "Short line", chords: [{ chord: "C", start: 0, end: 1 }] },
    ]);
  });

  it("wraps long lines at word boundaries", () => {
    const line: LyricLine = {
      lyrics: "Beauty that made this heart adore You",
      chords: [{ chord: "Am", start: 0, end: 1 }],
    };
    const segments = wrapLyricLine(line, 20);
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.map((s) => s.lyrics).join(" ").replace(/\s+/g, " ")).toContain(
      "Beauty that made this heart adore You",
    );
  });

  it("remaps chord positions per segment", () => {
    const line: LyricLine = {
      lyrics: "alpha beta gamma delta",
      chords: [
        { chord: "C", start: 0, end: 1 },
        { chord: "G", start: 11, end: 12 },
      ],
    };
    const segments = wrapLyricLine(line, 10);
    expect(segments[0]?.chords).toEqual([{ chord: "C", start: 0, end: 1 }]);
    expect(segments[1]?.chords[0]?.start).toBeLessThan(11);
  });
});

describe("charsPerLine", () => {
  it("estimates chars from container width", () => {
    expect(charsPerLine(390, 18)).toBeGreaterThan(30);
    expect(charsPerLine(0, 18)).toBe(32);
  });
});
