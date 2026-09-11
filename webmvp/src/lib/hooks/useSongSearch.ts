"use client";

import { useMemo } from "react";

import type { Key } from "@/lib/engine";
import { filterSongIndex } from "@/lib/firestore/songIndex";
import type { SongIndexEntry } from "@/lib/types";

export function useSongSearch(
  entries: SongIndexEntry[],
  query: string,
  keyFilter?: Key,
): SongIndexEntry[] {
  const normalizedQuery = query.trim().toLowerCase();

  return useMemo(
    () => filterSongIndex(entries, normalizedQuery, keyFilter),
    [entries, normalizedQuery, keyFilter],
  );
}
