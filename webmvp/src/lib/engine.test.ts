import { describe, expect, it } from "vitest";

import {
  chordToDegree,
  getDiatonicChords,
  isValidChord,
  parseChord,
  transposeChord,
} from "./engine";

describe("parseChord", () => {
  it("parses Am7", () => {
    const result = parseChord("Am7");
    expect(result.rootNum).toBe(9);
    expect(result.suffix).toBe("m7");
  });

  it("parses C/E slash chord", () => {
    const result = parseChord("C/E");
    expect(result.rootNum).toBe(0);
    expect(result.bassNum).toBe(4);
  });

  it("parses F#m7/C#", () => {
    const result = parseChord("F#m7/C#");
    expect(result.rootNum).toBe(6);
    expect(result.suffix).toBe("m7");
    expect(result.bassNum).toBe(1);
  });

  it("parses Bbmaj7", () => {
    const result = parseChord("Bbmaj7");
    expect(result).toEqual({ rootNum: 10, suffix: "maj7" });
  });

  it("throws on empty string", () => {
    expect(() => parseChord("")).toThrow();
  });
});

describe("transposeChord", () => {
  it("transposes C → D", () => {
    expect(transposeChord("C", "C", "D")).toBe("D");
  });

  it("transposes Am → Bm (C → D)", () => {
    expect(transposeChord("Am", "C", "D")).toBe("Bm");
  });

  it("transposes F → G (C → D)", () => {
    expect(transposeChord("F", "C", "D")).toBe("G");
  });

  it("transposes G7 → A7 (C → D)", () => {
    expect(transposeChord("G7", "C", "D")).toBe("A7");
  });

  it("transposes C/E → D/F# (C → D)", () => {
    expect(transposeChord("C/E", "C", "D")).toBe("D/F#");
  });

  it("transposes Fmaj7 → Gmaj7 (C → D)", () => {
    expect(transposeChord("Fmaj7", "C", "D")).toBe("Gmaj7");
  });

  it("transposes Dm7 → Em7 (C → D)", () => {
    expect(transposeChord("Dm7", "C", "D")).toBe("Em7");
  });

  it("transposes into flat keys", () => {
    expect(transposeChord("C", "C", "Eb")).toBe("Eb");
    expect(transposeChord("Am", "C", "Eb")).toBe("Cm");
    expect(transposeChord("G7", "C", "Eb")).toBe("Bb7");
  });

  it("returns unchanged chord when keys match", () => {
    expect(transposeChord("F#m7/C#", "A", "A")).toBe("F#m7/C#");
  });

  it("transposes C → G", () => {
    expect(transposeChord("C", "C", "G")).toBe("G");
  });

  it("transposes F → C (C → G)", () => {
    expect(transposeChord("F", "C", "G")).toBe("C");
  });

  it("transposes Am → Em (C → G)", () => {
    expect(transposeChord("Am", "C", "G")).toBe("Em");
  });

  it("transposes G/B → A/C# (C → D)", () => {
    expect(transposeChord("G/B", "C", "D")).toBe("A/C#");
  });

  it("transposes F#m → Am (A → C)", () => {
    expect(transposeChord("F#m", "A", "C")).toBe("Am");
  });
});

describe("line transpose", () => {
  it("transposes C C F C to G G C G (C → G)", () => {
    const line = ["C", "C", "F", "C"];
    const transposed = line.map((ch) => transposeChord(ch, "C", "G"));
    expect(transposed).toEqual(["G", "G", "C", "G"]);
  });
});

describe("chordToDegree", () => {
  it("maps diatonic chords in key C to Nashville numbers", () => {
    expect(chordToDegree("C", "C")).toBe("1");
    expect(chordToDegree("F", "C")).toBe("4");
    expect(chordToDegree("G", "C")).toBe("5");
    expect(chordToDegree("Am", "C")).toBe("6m");
    expect(chordToDegree("Em", "C")).toBe("3m");
    expect(chordToDegree("Bb", "C")).toBe("b7");
  });
});

describe("isValidChord", () => {
  it("rejects invalid chords", () => {
    expect(isValidChord("m")).toBe(false);
    expect(isValidChord("xyz")).toBe(false);
  });

  it("accepts valid chords", () => {
    expect(isValidChord("Am7")).toBe(true);
    expect(isValidChord("G/B")).toBe(true);
  });
});

describe("getDiatonicChords", () => {
  it('returns 6 valid chords for Bb', () => {
    const chords = getDiatonicChords("Bb");
    expect(chords).toHaveLength(6);
    for (const chord of chords) {
      expect(isValidChord(chord)).toBe(true);
    }
    expect(chords).toEqual(["Bb", "Eb", "F", "Gm", "Cm", "Dm"]);
  });
});
