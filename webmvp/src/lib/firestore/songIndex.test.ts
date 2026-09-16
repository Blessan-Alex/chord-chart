import { describe, expect, it } from "vitest";

import type { SongIndexEntry } from "@/lib/types";

import {
  assertIndexChunkSizes,
  buildIndexChunks,
  filterSongIndex,
  mergeIndexEntry,
  SONG_INDEX_CAPACITY,
  SongIndexCapacityError,
  SongIndexChunkSizeError,
  SONG_INDEX_CHUNK_MAX_BYTES,
  songToIndexEntry,
  writeSongIndexEntries,
} from "./songIndex";

const sampleEntries: SongIndexEntry[] = [
  {
    id: "way-maker",
    title: "Way Maker",
    artist: "Sinach",
    key: "E",
    tags: ["worship"],
    searchText: "way maker sinach worship",
  },
  {
    id: "good-good-father",
    title: "Good Good Father",
    artist: "Chris Tomlin",
    key: "A",
    tags: ["worship"],
    searchText: "good good father chris tomlin worship",
  },
  {
    id: "twinkle",
    title: "Twinkle Twinkle Little Star",
    artist: "",
    key: "C",
    tags: [],
    searchText: "twinkle twinkle little star",
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
    ).toEqual({ ...sampleEntries[0], updatedAtMs: 0 });
  });

  it("builds searchText from sections", () => {
    const entry = songToIndexEntry({
      id: "amazing-grace",
      title: "Amazing Grace",
      originalKey: "G",
      sections: [
        {
          label: "Verse 1",
          lines: [{ lyrics: "Amazing grace, how sweet the sound", chords: [] }],
        },
      ],
    });

    expect(entry.searchText).toContain("sweet the sound");
  });
});

describe("filterSongIndex", () => {
  it('finds "Way Maker" from substring "maker"', () => {
    const results = filterSongIndex(sampleEntries, "maker");
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("way-maker");
  });

  it("finds songs by lyric phrase in searchText", () => {
    const entries: SongIndexEntry[] = [
      {
        id: "amazing-grace",
        title: "Amazing Grace",
        artist: "",
        key: "G",
        tags: [],
        searchText: "amazing grace how sweet the sound",
      },
    ];

    const results = filterSongIndex(entries, "sweet the sound");
    expect(results.map((entry) => entry.id)).toEqual(["amazing-grace"]);
  });

  it("filters by key", () => {
    const results = filterSongIndex(sampleEntries, "", "C");
    expect(results.map((entry) => entry.id)).toEqual(["twinkle"]);
  });

  it("filters by language tag", () => {
    const entries: SongIndexEntry[] = [
      ...sampleEntries,
      {
        id: "malayalam-song",
        title: "Malayalam Song",
        artist: "",
        key: "C",
        tags: ["lang:malayalam"],
      },
    ];
    const results = filterSongIndex(entries, "", undefined, "lang:malayalam");
    expect(results.map((entry) => entry.id)).toEqual(["malayalam-song"]);
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

describe("assertIndexChunkSizes", () => {
  it("rejects chunks that exceed the Firestore byte budget", () => {
    const hugeEntry: SongIndexEntry = {
      id: "huge",
      title: "Huge Song",
      artist: "",
      key: "C",
      tags: [],
      searchText: "x".repeat(SONG_INDEX_CHUNK_MAX_BYTES),
    };
    const chunks = buildIndexChunks([hugeEntry]);

    expect(() => assertIndexChunkSizes(chunks)).toThrow(SongIndexChunkSizeError);
  });
});

describe("writeSongIndexEntries capacity guard", () => {
  it("rejects entry counts over capacity before touching Firestore", async () => {
    const overCapacity: SongIndexEntry[] = Array.from(
      { length: SONG_INDEX_CAPACITY + 1 },
      (_, i) => ({
        id: `song-${i}`,
        title: `Song ${i}`,
        artist: "",
        key: "C",
        tags: [],
      }),
    );

    await expect(writeSongIndexEntries(overCapacity)).rejects.toBeInstanceOf(
      SongIndexCapacityError,
    );
  });
});
