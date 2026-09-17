import { describe, expect, it } from "vitest";

import { countChordsInSections } from "./chordProParser";
import { parseImportText } from "./parseImportText";

const CHORDPRO_SAMPLE = `{Intro}
[F#m]Nin mukham [E]test

{Verse 1}
Sarva [E]Bhoomikum`;

describe("parseImportText", () => {
  it("parses ChordPro paste with curly sections and chords", () => {
    const sections = parseImportText(CHORDPRO_SAMPLE);
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(countChordsInSections(sections)).toBeGreaterThan(0);
    expect(sections[0].label).toBe("Intro");
    expect(sections[0].lines[0].lyrics).not.toContain("[F#m]");
  });

  it("parses plain lyric lines without chords into default section", () => {
    const sections = parseImportText("{Verse 1}\nLine one\nLine two");
    expect(sections).toHaveLength(1);
    expect(countChordsInSections(sections)).toBe(0);
    expect(sections[0].lines[0].lyrics).toBe("Line one");
  });
});
