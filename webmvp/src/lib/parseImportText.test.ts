import { describe, expect, it } from "vitest";

import { countChordsInSections } from "./chordProParser";
import { looksLikeChordPro, parseImportText } from "./parseImportText";

const CHORDPRO_SAMPLE = `[Intro]
E[B]nthu [E]Njaan Pakaram Nalk[B]um
Nee K[E]aruthum Karuthalin[B]ayi

[Verse 1]
Sarva [E]Bhoomikum Raajaavum N[B]ee

[Chorus]
Enne [E]Maanikunna Dai[B]vam`;

describe("looksLikeChordPro", () => {
  it("detects inline chords", () => {
    expect(looksLikeChordPro("[Verse 1]\n[E]Hello [B]world")).toBe(true);
  });

  it("returns false for section headers only", () => {
    expect(looksLikeChordPro("[Verse 1]\nPlain line\n[Chorus]\nAnother line")).toBe(
      false,
    );
  });

  it("returns false for empty input", () => {
    expect(looksLikeChordPro("")).toBe(false);
  });
});

describe("parseImportText", () => {
  it("parses ChordPro paste with chords", () => {
    const sections = parseImportText(CHORDPRO_SAMPLE);
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(countChordsInSections(sections)).toBeGreaterThan(0);
    expect(sections[0].lines[0].lyrics).not.toContain("[E]");
  });

  it("parses plain lyrics without chords", () => {
    const sections = parseImportText("[Verse 1]\nLine one\nLine two");
    expect(sections).toHaveLength(1);
    expect(countChordsInSections(sections)).toBe(0);
    expect(sections[0].lines[0].lyrics).toBe("Line one");
  });
});
