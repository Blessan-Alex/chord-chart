"use client";

import { useMemo } from "react";

import type { Key } from "@/lib/engine";
import { filterSongIndex } from "@/lib/firestore/songIndex";
import type { SongIndexEntry } from "@/lib/types";

export function useSongSearch(
  entries: SongIndexEntry[],
  query: string,
  keyFilter?: Key,
  tagFilter?: string,
  artistFilter?: string,
): SongIndexEntry[] {
  return useMemo(
    () => filterSongIndex(entries, query, keyFilter, tagFilter, artistFilter),
    [entries, query, keyFilter, tagFilter, artistFilter],
  );
}
