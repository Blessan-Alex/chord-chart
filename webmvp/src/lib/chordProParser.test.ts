import { describe, expect, it } from "vitest";

import {
  countChordsInSections,
  parseChordProLine,
  parseChordProSections,
  sectionsToChordProText,
  serializeChordProLine,
} from "./chordProParser";

describe("parseChordProLine", () => {
  it("parses inline chords", () => {
    const line = parseChordProLine("[Am]Amazing [G]grace");
    expect(line.lyrics).toBe("Amazing grace");
    expect(line.chords).toEqual([
      { chord: "Am", start: 0, end: 1 },
      { chord: "G", start: 8, end: 9 },
    ]);
  });

  it("handles chords mid-word", () => {
    const line = parseChordProLine("Ama[G]zing");
    expect(line.lyrics).toBe("Amazing");
    expect(line.chords[0]).toEqual({ chord: "G", start: 3, end: 4 });
  });
});

describe("parseChordProSections", () => {
  it("parses sections and chords together", () => {
    const sections = parseChordProSections(
      "[Verse 1]\n[Am]Line one\nPlain line\n\n[Chorus]\n[G]Sing",
    );
    expect(sections).toHaveLength(2);
    expect(sections[0].lines[0].chords[0]?.chord).toBe("Am");
    expect(sections[0].lines[1].chords).toHaveLength(0);
    expect(sections[1].lines[0].chords[0]?.chord).toBe("G");
  });
});

describe("serializeChordProLine", () => {
  it("round-trips a line", () => {
    const input = "[C]Twinkle, [Am]twinkle";
    const line = parseChordProLine(input);
    expect(serializeChordProLine(line)).toBe(input);
  });
});

describe("sectionsToChordProText", () => {
  it("serializes sections for the source editor", () => {
    const sections = parseChordProSections("[Verse]\n[Am]Hello");
    expect(sectionsToChordProText(sections)).toBe("[Verse]\n[Am]Hello");
  });
});

describe("countChordsInSections", () => {
  it("counts all chord marks", () => {
    const sections = parseChordProSections("[Verse]\n[Am]a [G]b");
    expect(countChordsInSections(sections)).toBe(2);
  });
});
