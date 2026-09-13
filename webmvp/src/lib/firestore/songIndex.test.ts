import { describe, expect, it } from "vitest";

import type { SongIndexEntry } from "@/lib/types";

import {
  buildIndexChunks,
  filterSongIndex,
  mergeIndexEntry,
  songToIndexEntry,
} from "./songIndex";

const sampleEntries: SongIndexEntry[] = [
  {
    id: "way-maker",
    title: "Way Maker",
    artist: "Sinach",
    key: "E",
    tags: ["worship"],
  },
  {
    id: "good-good-father",
    title: "Good Good Father",
    artist: "Chris Tomlin",
    key: "A",
    tags: ["worship"],
  },
  {
    id: "twinkle",
    title: "Twinkle Twinkle Little Star",
    artist: "",
    key: "C",
    tags: [],
  },
];

describe("songToIndexEntry", () => {
  it("maps song fields to index entry", () => {
    expect(
      songToIndexEntry({
        id: "way-maker",
        title: "Way Maker",
        artist: "Sinach",
        originalKey: "E",
        tags: ["worship"],
      }),
    ).toEqual(sampleEntries[0]);
  });
});

describe("filterSongIndex", () => {
  it('finds "Way Maker" from substring "maker"', () => {
    const results = filterSongIndex(sampleEntries, "maker");
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("way-maker");
  });

  it("filters by key", () => {
    const results = filterSongIndex(sampleEntries, "", "C");
    expect(results.map((entry) => entry.id)).toEqual(["twinkle"]);
  });

  it("sorts alphabetically when query is empty", () => {
    const results = filterSongIndex(sampleEntries, "");
    expect(results.map((entry) => entry.title)).toEqual([
      "Good Good Father",
      "Twinkle Twinkle Little Star",
      "Way Maker",
    ]);
  });

  it("handles legacy entries missing artist or tags", () => {
    const legacy = [
      {
        id: "legacy",
        title: "Legacy Song",
        key: "C" as const,
      } as SongIndexEntry,
    ];
    expect(() => filterSongIndex(legacy, "legacy")).not.toThrow();
    expect(filterSongIndex(legacy, "legacy")).toHaveLength(1);
  });
});

describe("mergeIndexEntry", () => {
  it("adds a new entry sorted by title", () => {
    const merged = mergeIndexEntry(sampleEntries, {
      id: "amazing-grace",
      title: "Amazing Grace",
      artist: "",
      key: "G",
      tags: [],
    });
    expect(merged.map((entry) => entry.id)).toEqual([
      "amazing-grace",
      "good-good-father",
      "twinkle",
      "way-maker",
    ]);
  });

  it("replaces an existing entry by id", () => {
    const merged = mergeIndexEntry(sampleEntries, {
      id: "way-maker",
      title: "Way Maker (Live)",
      artist: "Sinach",
      key: "F",
      tags: ["worship"],
    });
    expect(merged.find((entry) => entry.id === "way-maker")?.title).toBe(
      "Way Maker (Live)",
    );
    expect(merged).toHaveLength(3);
  });
});

describe("buildIndexChunks", () => {
  it("places all entries in chunk0 for small libraries", () => {
    const chunks = buildIndexChunks(sampleEntries);
    expect(chunks.size).toBe(1);
    expect(chunks.get("chunk0")).toHaveLength(3);
  });
});
