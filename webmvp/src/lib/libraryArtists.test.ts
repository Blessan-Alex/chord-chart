import { describe, expect, it } from "vitest";

import type { SongIndexEntry } from "@/lib/types";

import {
  artistMatchesFilter,
  collectLibraryArtists,
  isArtistFilterValid,
} from "./libraryArtists";

describe("libraryArtists", () => {
  const entries: SongIndexEntry[] = [
    {
      id: "a",
      title: "Song A",
      artist: "Sinach",
      key: "C",
      tags: [],
    },
    {
      id: "b",
      title: "Song B",
      artist: "Sinach",
      key: "G",
      tags: [],
    },
    {
      id: "c",
      title: "Song C",
      artist: "",
      key: "C",
      tags: [],
    },
  ];

  it("collects unique sorted artist names", () => {
    expect(collectLibraryArtists(entries)).toEqual(["Sinach"]);
  });

  it("deduplicates artists that differ only by casing", () => {
    const mixed: SongIndexEntry[] = [
      { id: "1", title: "One", artist: "sinach", key: "C", tags: [] },
      { id: "2", title: "Two", artist: "Sinach", key: "G", tags: [] },
    ];
    expect(collectLibraryArtists(mixed)).toEqual(["sinach"]);
  });

  it("matches artist filter case-insensitively", () => {
    expect(artistMatchesFilter("Sinach", "sinach")).toBe(true);
    expect(artistMatchesFilter("Sinach", "Chris Tomlin")).toBe(false);
  });

  it("validates active artist filter against available options", () => {
    expect(isArtistFilterValid("", ["Sinach"])).toBe(true);
    expect(isArtistFilterValid("Sinach", ["Sinach"])).toBe(true);
    expect(isArtistFilterValid("Sinach", [])).toBe(false);
    expect(isArtistFilterValid("Removed Artist", ["Sinach"])).toBe(false);
  });
});
