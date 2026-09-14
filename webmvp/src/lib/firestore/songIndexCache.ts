import type { SongIndexEntry } from "@/lib/types";

import {
  loadSongIndex,
  loadSongIndexChunks,
  SONG_INDEX_CHUNK_IDS,
} from "./songIndex";

let cachedEntries: SongIndexEntry[] | null = null;
let partialEntries: SongIndexEntry[] | null = null;
let inflight: Promise<SongIndexEntry[]> | null = null;
let inflightProgressive: Promise<SongIndexEntry[]> | null = null;

/** In-memory cache so tab switches and remounts feel instant. */
export function peekSongIndexCache(): SongIndexEntry[] | null {
  return cachedEntries ?? partialEntries;
}

export function clearSongIndexCache(): void {
  cachedEntries = null;
  partialEntries = null;
  inflight = null;
  inflightProgressive = null;
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
      partialEntries = null;
      return entries;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Load chunk0 first for fast Home paint, then merge remaining chunks in background. */
export async function loadSongIndexCachedProgressive(
  onPartial?: (entries: SongIndexEntry[]) => void,
  options: { preferServer?: boolean } = {},
): Promise<SongIndexEntry[]> {
  if (cachedEntries && !options.preferServer) {
    onPartial?.(cachedEntries);
    return cachedEntries;
  }

  if (inflightProgressive) {
    return inflightProgressive;
  }

  inflightProgressive = (async () => {
    try {
      const chunk0 = await loadSongIndexChunks(["chunk0"], undefined, options);
      partialEntries = chunk0;
      onPartial?.(chunk0);

      const remainingIds = SONG_INDEX_CHUNK_IDS.slice(1);
      const rest = await loadSongIndexChunks(remainingIds, undefined, options);
      const merged = [...chunk0, ...rest].sort((a, b) =>
        a.title.localeCompare(b.title),
      );
      cachedEntries = merged;
      partialEntries = null;
      onPartial?.(merged);
      return merged;
    } catch (error) {
      partialEntries = null;
      throw error;
    }
  })().finally(() => {
    inflightProgressive = null;
  });

  return inflightProgressive;
}
