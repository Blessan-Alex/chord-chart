import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRecentSongs, recordRecentSong } from "./recentSongs";

describe("recentSongs", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts empty", () => {
    expect(getRecentSongs()).toEqual([]);
  });

  it("records a song at the front", () => {
    recordRecentSong({
      songId: "song-1",
      title: "Amazing Grace",
      artist: "John Newton",
      key: "G",
    });

    expect(getRecentSongs()).toEqual([
      expect.objectContaining({
        songId: "song-1",
        title: "Amazing Grace",
        artist: "John Newton",
        key: "G",
      }),
    ]);
  });

  it("moves an existing song to the front", () => {
    recordRecentSong({
      songId: "a",
      title: "A",
      artist: "",
      key: "C",
    });
    recordRecentSong({
      songId: "b",
      title: "B",
      artist: "",
      key: "D",
    });
    recordRecentSong({
      songId: "a",
      title: "A",
      artist: "",
      key: "C",
    });

    expect(getRecentSongs().map((entry) => entry.songId)).toEqual(["a", "b"]);
  });

  it("caps the list at 10 entries", () => {
    for (let i = 0; i < 12; i += 1) {
      recordRecentSong({
        songId: `song-${i}`,
        title: `Song ${i}`,
        artist: "",
        key: "C",
      });
    }

    expect(getRecentSongs()).toHaveLength(10);
    expect(getRecentSongs()[0]?.songId).toBe("song-11");
  });

  it("returns empty array for invalid stored JSON", () => {
    storage.set("lf-recent-songs", "{not-json");
    expect(getRecentSongs()).toEqual([]);
  });
});
