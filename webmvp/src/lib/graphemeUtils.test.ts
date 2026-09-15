import { describe, expect, it } from "vitest";

import {
  graphemeRangeAt,
  snapRangeToGraphemes,
  splitGraphemes,
} from "@/lib/graphemeUtils";

describe("graphemeUtils", () => {
  it("splits Malayalam into grapheme clusters", () => {
    const text = "നന്ദി";
    const parts = splitGraphemes(text);
    expect(parts.join("")).toBe(text);
    expect(parts.length).toBeGreaterThan(0);
  });

  it("snaps partial selections to grapheme boundaries", () => {
    const text = "hello";
    expect(snapRangeToGraphemes(text, 1, 4)).toEqual({ start: 1, end: 4 });
  });

  it("returns a grapheme range at an index", () => {
    const text = "abc def";
    const range = graphemeRangeAt(text, 4);
    expect(text.slice(range.start, range.end)).toBe("d");
  });
});
