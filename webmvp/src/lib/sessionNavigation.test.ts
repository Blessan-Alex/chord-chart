import { describe, expect, it } from "vitest";

import {
  buildAdjacentSongHref,
  parseSessionNavParams,
  sessionSongHref,
  startSetHref,
} from "@/lib/sessionNavigation";
import type { SessionSong } from "@/lib/types";

const songs: SessionSong[] = [
  {
    id: "a",
    songId: "song-1",
    songTitle: "Song One",
    order: 0,
    keyOverride: "G",
    notes: null,
    addedBy: "u1",
    addedAt: {} as SessionSong["addedAt"],
  },
  {
    id: "b",
    songId: "song-2",
    songTitle: "Song Two",
    order: 1,
    keyOverride: null,
    notes: null,
    addedBy: "u1",
    addedAt: {} as SessionSong["addedAt"],
  },
];

describe("sessionNavigation", () => {
  it("parses playlist params", () => {
    const params = new URLSearchParams("playlist=s1&index=1&key=G");
    expect(parseSessionNavParams(params)).toEqual({
      sessionId: "s1",
      index: 1,
    });
  });

  it("parses legacy session params", () => {
    const params = new URLSearchParams("session=s1&index=1&key=G");
    expect(parseSessionNavParams(params)).toEqual({
      sessionId: "s1",
      index: 1,
    });
  });

  it("builds song href with playlist context", () => {
    expect(sessionSongHref("s1", songs[0], 0)).toBe(
      "/song/song-1?playlist=s1&index=0&key=G",
    );
  });

  it("builds start set href", () => {
    expect(startSetHref("s1", songs)).toBe(
      "/song/song-1?playlist=s1&index=0&key=G",
    );
  });

  it("builds adjacent hrefs", () => {
    expect(buildAdjacentSongHref("s1", songs, 1, -1)).toBe(
      "/song/song-1?playlist=s1&index=0&key=G",
    );
    expect(buildAdjacentSongHref("s1", songs, 0, 1)).toBe(
      "/song/song-2?playlist=s1&index=1",
    );
    expect(buildAdjacentSongHref("s1", songs, 0, -1)).toBeNull();
  });
});
