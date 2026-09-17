import { describe, expect, it } from "vitest";

import { parseRawLyrics } from "./editorParser";

describe("parseRawLyrics", () => {
  it("parses a section header in curly braces", () => {
    const sections = parseRawLyrics("{Verse 1}\nLine one\nLine two");
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe("Verse 1");
    expect(sections[0].lines).toHaveLength(2);
    expect(sections[0].lines[0].lyrics).toBe("Line one");
    expect(sections[0].lines[1].lyrics).toBe("Line two");
  });

  it("creates a default section when no header is present", () => {
    const sections = parseRawLyrics("Line one\nLine two");
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe("Section 1");
    expect(sections[0].lines).toHaveLength(2);
  });

  it("parses multiple sections", () => {
    const sections = parseRawLyrics("{Verse 1}\nLine\n\n{Chorus}\nLine");
    expect(sections).toHaveLength(2);
    expect(sections[0].label).toBe("Verse 1");
    expect(sections[0].lines).toHaveLength(1);
    expect(sections[1].label).toBe("Chorus");
    expect(sections[1].lines).toHaveLength(1);
  });

  it("returns a default empty section for empty input", () => {
    const sections = parseRawLyrics("");
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe("Verse 1");
    expect(sections[0].lines).toHaveLength(0);
  });

  it('treats "He said:" as a lyric line, not a section header', () => {
    const sections = parseRawLyrics("{Verse 1}\nHe said:\nHello");
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe("Verse 1");
    expect(sections[0].lines).toHaveLength(2);
    expect(sections[0].lines[0].lyrics).toBe("He said:");
    expect(sections[0].lines[1].lyrics).toBe("Hello");
  });

  it('treats "Chorus:" as a section header', () => {
    const sections = parseRawLyrics("Chorus:\nLine one");
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe("Chorus");
    expect(sections[0].lines).toHaveLength(1);
    expect(sections[0].lines[0].lyrics).toBe("Line one");
  });
});
