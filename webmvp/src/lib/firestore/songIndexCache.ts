import type { SongIndexEntry } from "@/lib/types";

import { loadSongIndex } from "./songIndex";

let cachedEntries: SongIndexEntry[] | null = null;
let inflight: Promise<SongIndexEntry[]> | null = null;

/** In-memory cache so tab switches and remounts feel instant. */
export function peekSongIndexCache(): SongIndexEntry[] | null {
  return cachedEntries;
}

export function clearSongIndexCache(): void {
  cachedEntries = null;
  inflight = null;
}

export async function loadSongIndexCached(
  options: { preferServer?: boolean } = {},
): Promise<SongIndexEntry[]> {
  if (cachedEntries && !options.preferServer) {
    return cachedEntries;
  }

  if (inflight) {
    return inflight;
  }

  inflight = loadSongIndex(undefined, { preferServer: options.preferServer })
    .then((entries) => {
      cachedEntries = entries;
      return entries;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
