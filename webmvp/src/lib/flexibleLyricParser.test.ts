import { describe, expect, it } from "vitest";

import { parseFlexibleLyricSource } from "@/lib/flexibleLyricParser";

describe("parseFlexibleLyricSource", () => {
  it("splits paragraphs on blank lines into Verse 1 and Verse 2", () => {
    const sections = parseFlexibleLyricSource(
      "Line one\nLine two\n\nSecond verse line",
    );
    expect(sections).toHaveLength(2);
    expect(sections[0].label).toBe("Verse 1");
    expect(sections[0].lines).toHaveLength(2);
    expect(sections[1].label).toBe("Verse 2");
    expect(sections[1].lines[0].lyrics).toBe("Second verse line");
  });

  it("honours explicit section headers", () => {
    const sections = parseFlexibleLyricSource("{Chorus}\nHoly holy");
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe("Chorus");
  });

  it("parses inline chords on a line", () => {
    const sections = parseFlexibleLyricSource("[G]Amazing grace");
    expect(sections[0].lines[0].chords).toHaveLength(1);
    expect(sections[0].lines[0].lyrics).toBe("Amazing grace");
  });
});
