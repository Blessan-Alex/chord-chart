import { describe, expect, it } from "vitest";

import { validateSession, validateSong, validateUsername } from "./validation";

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

  it("rejects chord marks outside lyric bounds", () => {
    const result = validateSong({
      ...validSong,
      sections: [
        {
          label: "Verse 1",
          lines: [
            {
              lyrics: "Hi",
              chords: [{ chord: "C", start: 0, end: 5 }],
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("exceeds lyrics length"))).toBe(
        true,
      );
    }
  });

  it("accepts start/end chord marks", () => {
    const result = validateSong({
      ...validSong,
      sections: [
        {
          label: "Verse 1",
          lines: [
            {
              lyrics: "Hello world",
              chords: [{ chord: "C", start: 0, end: 1 }],
            },
          ],
        },
      ],
    });
    expect(result).toEqual({ ok: true });
  });
});

describe("validateUsername", () => {
  it("accepts valid usernames", () => {
    expect(validateUsername("alex_rivera")).toEqual({
      ok: true,
      normalized: "alex_rivera",
    });
  });

  it("normalizes uppercase input", () => {
    expect(validateUsername("AlexRivera")).toEqual({
      ok: true,
      normalized: "alexrivera",
    });
  });

  it("rejects empty usernames", () => {
    const result = validateUsername("   ");
    expect(result.ok).toBe(false);
  });

  it("rejects too long usernames", () => {
    const result = validateUsername("a".repeat(21));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("3–20");
    }
  });

  it("rejects invalid characters", () => {
    const result = validateUsername("bad-name");
    expect(result.ok).toBe(false);
  });
});

describe("validateSession", () => {
  it("accepts a valid session shape", () => {
    expect(
      validateSession({
        title: "Sunday Morning",
        serviceType: "sunday_morning",
        status: "published",
        songCount: 3,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects invalid service type", () => {
    const result = validateSession({
      title: "Test",
      serviceType: "invalid",
      status: "draft",
      songCount: 0,
    });
    expect(result.ok).toBe(false);
  });
});
