import { describe, expect, it } from "vitest";

import type { SongIndexEntry } from "@/lib/types";

import { rankSongIndexResults } from "./songSearchRank";

const entries: SongIndexEntry[] = [
  {
    id: "way-maker",
    title: "Way Maker",
    artist: "Sinach",
    key: "E",
    tags: ["worship"],
    searchText: "way maker sinach worship miracle worker",
  },
  {
    id: "lyric-only",
    title: "Another Song",
    artist: "",
    key: "C",
    tags: [],
    searchText: "the way maker lives forever",
  },
  {
    id: "good-good-father",
    title: "Good Good Father",
    artist: "Chris Tomlin",
    key: "A",
    tags: ["worship"],
    searchText: "good good father chris tomlin",
  },
  {
    id: "malayalam-song",
    title: "Malayalam Song",
    artist: "",
    key: "G",
    tags: ["lang:malayalam"],
    searchText: "malayalam lyrics here",
  },
];

describe("rankSongIndexResults", () => {
  it("ranks title matches above lyric-only matches", () => {
    const results = rankSongIndexResults(entries, "maker");
    expect(results[0]?.id).toBe("way-maker");
    expect(results.some((entry) => entry.id === "lyric-only")).toBe(true);
  });

  it("requires all tokens to match somewhere", () => {
    const results = rankSongIndexResults(entries, "good father");
    expect(results.map((entry) => entry.id)).toEqual(["good-good-father"]);
  });

  it("excludes entries that miss a token", () => {
    const results = rankSongIndexResults(entries, "good maker");
    expect(results).toHaveLength(0);
  });

  it("applies key filter before scoring", () => {
    const results = rankSongIndexResults(entries, "maker", "C");
    expect(results.map((entry) => entry.id)).toEqual(["lyric-only"]);
  });

  it("applies language filter before scoring", () => {
    const results = rankSongIndexResults(
      entries,
      "malayalam",
      undefined,
      "lang:malayalam",
    );
    expect(results.map((entry) => entry.id)).toEqual(["malayalam-song"]);
  });

  it("sorts alphabetically when query is empty", () => {
    const results = rankSongIndexResults(entries, "");
    expect(results.map((entry) => entry.title)).toEqual([
      "Another Song",
      "Good Good Father",
      "Malayalam Song",
      "Way Maker",
    ]);
  });

  it("finds lyric phrases in searchText", () => {
    const results = rankSongIndexResults(entries, "miracle worker");
    expect(results[0]?.id).toBe("way-maker");
  });
});
