import { describe, expect, it } from "vitest";

import { validateSong } from "./validation";

const validSong = {
  id: "song-1",
  title: "Test Song",
  originalKey: "C",
  sections: [
    {
      label: "Verse 1",
      lines: [
        {
          lyrics: "Hello world",
          chords: [{ chord: "C", position: 0 }],
        },
      ],
    },
  ],
};

describe("validateSong", () => {
  it("accepts a complete song", () => {
    expect(validateSong(validSong)).toEqual({ ok: true });
  });

  it("rejects missing title", () => {
    const result = validateSong({ ...validSong, title: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("title is required");
    }
  });

  it("rejects invalid originalKey", () => {
    const result = validateSong({ ...validSong, originalKey: "H" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain(
        "originalKey must be one of the 12 major keys",
      );
    }
  });

  it("rejects invalid chord marks", () => {
    const result = validateSong({
      ...validSong,
      sections: [
        {
          label: "Verse 1",
          lines: [
            {
              lyrics: "Hello",
              chords: [{ chord: "xyz", position: 0 }],
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('invalid chord "xyz"'))).toBe(
        true,
      );
    }
  });
});
