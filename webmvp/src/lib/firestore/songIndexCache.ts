import type { SongIndexEntry } from "@/lib/types";

import { doc, onSnapshot } from "firebase/firestore";

import { getDb } from "@/lib/firebase";

import {
  loadSongIndex,
  loadSongIndexChunks,
  SONG_INDEX_CHUNK_IDS,
} from "./songIndex";

let cachedEntries: SongIndexEntry[] | null = null;
let partialEntries: SongIndexEntry[] | null = null;
let inflight: Promise<SongIndexEntry[]> | null = null;
let inflightProgressive: Promise<SongIndexEntry[]> | null = null;
let cacheGeneration = 0;
let indexUnsubscribe: (() => void) | null = null;
let indexListenerCount = 0;
const indexListeners = new Set<(entries: SongIndexEntry[]) => void>();

function beginCacheRefresh(): number {
  cacheGeneration += 1;
  inflight = null;
  inflightProgressive = null;
  return cacheGeneration;
}

function isCurrentGeneration(generation: number): boolean {
  return generation === cacheGeneration;
}

/** In-memory cache so tab switches and remounts feel instant. */
export function peekSongIndexCache(): SongIndexEntry[] | null {
  return cachedEntries ?? partialEntries;
}

/** Full merged index only — excludes progressive chunk0 partial. */
export function peekFullSongIndexCache(): SongIndexEntry[] | null {
  return cachedEntries;
}

export function clearSongIndexCache(): void {
  cachedEntries = null;
  partialEntries = null;
  inflight = null;
  inflightProgressive = null;
  cacheGeneration += 1;
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

  const loadGeneration = cacheGeneration;

  inflight = loadSongIndex(undefined, { preferServer: options.preferServer })
    .then((entries) => {
      if (!isCurrentGeneration(loadGeneration)) {
        return cachedEntries ?? entries;
      }
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

  const loadGeneration = cacheGeneration;

  inflightProgressive = (async () => {
    try {
      const chunk0 = await loadSongIndexChunks(["chunk0"], undefined, options);
      if (!isCurrentGeneration(loadGeneration)) {
        return cachedEntries ?? chunk0;
      }
      partialEntries = chunk0;
      onPartial?.(chunk0);

      const remainingIds = SONG_INDEX_CHUNK_IDS.slice(1);
      const rest = await loadSongIndexChunks(remainingIds, undefined, options);
      const merged = [...chunk0, ...rest].sort((a, b) =>
        a.title.localeCompare(b.title),
      );
      if (!isCurrentGeneration(loadGeneration)) {
        return cachedEntries ?? merged;
      }
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

function notifyIndexListeners(entries: SongIndexEntry[]) {
  for (const listener of indexListeners) {
    listener(entries);
  }
}

async function refreshIndexFromServer(): Promise<SongIndexEntry[]> {
  const refreshGeneration = beginCacheRefresh();
  const entries = await loadSongIndex(undefined, { preferServer: true });
  if (!isCurrentGeneration(refreshGeneration)) {
    return cachedEntries ?? entries;
  }
  cachedEntries = entries;
  partialEntries = null;
  notifyIndexListeners(entries);
  return entries;
}

/** One listener on chunk0 — reloads full index when songs are added (Spark-safe). */
export function subscribeSongIndexUpdates(
  onUpdate: (entries: SongIndexEntry[]) => void,
): () => void {
  indexListeners.add(onUpdate);
  indexListenerCount += 1;

  const cached = cachedEntries;
  if (cached) {
    onUpdate(cached);
  }

  if (indexListenerCount === 1) {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let skipInitialSnapshot = true;
    const chunkRef = doc(getDb(), "songIndex", "chunk0");
    indexUnsubscribe = onSnapshot(chunkRef, () => {
      if (skipInitialSnapshot) {
        skipInitialSnapshot = false;
        if (!cachedEntries) {
          void refreshIndexFromServer();
        }
        return;
      }
      if (debounce) {
        clearTimeout(debounce);
      }
      debounce = setTimeout(() => {
        void refreshIndexFromServer();
      }, 400);
    });
  }

  return () => {
    indexListeners.delete(onUpdate);
    indexListenerCount -= 1;
    if (indexListenerCount === 0 && indexUnsubscribe) {
      indexUnsubscribe();
      indexUnsubscribe = null;
    }
  };
}
