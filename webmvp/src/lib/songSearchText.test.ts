import { describe, expect, it } from "vitest";

import {
  buildSongSearchText,
  flattenSectionsLyrics,
  SONG_INDEX_SEARCH_TEXT_MAX,
} from "@/lib/songSearchText";
import type { Section } from "@/lib/types";

const sampleSections: Section[] = [
  {
    label: "Verse 1",
    lines: [
      { lyrics: "Amazing grace, how sweet the sound", chords: [] },
      { lyrics: "That saved a wretch like me", chords: [] },
    ],
  },
];

describe("flattenSectionsLyrics", () => {
  it("returns all lyric lines in order", () => {
    expect(flattenSectionsLyrics(sampleSections)).toEqual([
      "Amazing grace, how sweet the sound",
      "That saved a wretch like me",
    ]);
  });
});

describe("buildSongSearchText", () => {
  it("includes title, artist, tags, and lyrics", () => {
    const text = buildSongSearchText({
      title: "Amazing Grace",
      artist: "John Newton",
      tags: ["lang:english", "worship"],
      sections: sampleSections,
    });

    expect(text).toContain("amazing grace");
    expect(text).toContain("john newton");
    expect(text).toContain("lang:english");
    expect(text).toContain("sweet the sound");
    expect(text).toContain("wretch like me");
  });

  it("normalizes whitespace and case", () => {
    const text = buildSongSearchText({
      title: "  Hello   World  ",
      sections: [
        {
          label: "Verse",
          lines: [{ lyrics: "Line   one", chords: [] }],
        },
      ],
    });

    expect(text).toBe("hello world line one");
  });

  it("truncates at SONG_INDEX_SEARCH_TEXT_MAX", () => {
    const longLyric = "word ".repeat(SONG_INDEX_SEARCH_TEXT_MAX);
    const text = buildSongSearchText({
      title: "Long Song",
      sections: [
        {
          label: "Verse",
          lines: [{ lyrics: longLyric, chords: [] }],
        },
      ],
    });

    expect(text.length).toBe(SONG_INDEX_SEARCH_TEXT_MAX);
  });
});
