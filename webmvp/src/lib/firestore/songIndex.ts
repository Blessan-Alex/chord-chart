import {
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";

import { trackReads } from "@/lib/readCounter";

import type { Key } from "@/lib/engine";
import { getDb } from "@/lib/firebase";
import type { SongIndexChunk, SongIndexEntry } from "@/lib/types";

export const SONG_INDEX_CHUNK_IDS = [
  "chunk0",
  "chunk1",
  "chunk2",
  "chunk3",
  "chunk4",
] as const;

export const SONG_INDEX_CHUNK_SIZE = 2000;

/**
 * Maximum songs the fixed-chunk index can hold (chunks × size).
 * Entries beyond this would be dropped by buildIndexChunks and silently
 * vanish from browse/search, so writes are hard-stopped at this limit.
 */
export const SONG_INDEX_CAPACITY =
  SONG_INDEX_CHUNK_IDS.length * SONG_INDEX_CHUNK_SIZE;

export class SongIndexCapacityError extends Error {
  constructor(attempted: number) {
    super(
      `Song index is full: ${attempted} entries exceeds capacity of ${SONG_INDEX_CAPACITY}. ` +
        `Add another index chunk before creating more songs.`,
    );
    this.name = "SongIndexCapacityError";
  }
}

export type SongIndexChunkId = (typeof SONG_INDEX_CHUNK_IDS)[number];

export function songToIndexEntry(song: {
  id: string;
  title: string;
  artist?: string;
  originalKey: Key;
  tags?: string[];
}): SongIndexEntry {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist ?? "",
    key: song.originalKey,
    tags: song.tags ?? [],
  };
}

/** Split sorted entries into fixed-size chunk documents. */
/** Insert or replace one entry, sorted by title. */
export function mergeIndexEntry(
  entries: SongIndexEntry[],
  entry: SongIndexEntry,
): SongIndexEntry[] {
  const next = entries.filter((existing) => existing.id !== entry.id);
  next.push(entry);
  return next.sort((a, b) => a.title.localeCompare(b.title));
}

export function buildIndexChunks(
  entries: SongIndexEntry[],
): Map<SongIndexChunkId, SongIndexEntry[]> {
  const sorted = [...entries].sort((a, b) => a.title.localeCompare(b.title));
  const chunks = new Map<SongIndexChunkId, SongIndexEntry[]>();

  for (let i = 0; i < SONG_INDEX_CHUNK_IDS.length; i++) {
    const start = i * SONG_INDEX_CHUNK_SIZE;
    const slice = sorted.slice(start, start + SONG_INDEX_CHUNK_SIZE);
    if (slice.length > 0) {
      chunks.set(SONG_INDEX_CHUNK_IDS[i], slice);
    }
  }

  return chunks;
}

/** Local substring search — 0 Firestore reads per keystroke. */
export function filterSongIndex(
  entries: SongIndexEntry[],
  query: string,
  keyFilter?: Key,
): SongIndexEntry[] {
  const q = query.trim().toLowerCase();
  let results = entries;

  if (keyFilter) {
    results = results.filter((entry) => entry.key === keyFilter);
  }

  if (!q) {
    return [...results].sort((a, b) => a.title.localeCompare(b.title));
  }

  return results
    .filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        (entry.artist ?? "").toLowerCase().includes(q) ||
        (entry.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
    )
    .sort((a, b) => a.title.localeCompare(b.title));
}

function resolveDb(db?: Firestore): Firestore {
  return db ?? getDb();
}

/** Fetch all index chunks. Uses local cache first for instant paint, then server. */
export async function loadSongIndexChunks(
  chunkIds: readonly SongIndexChunkId[],
  db?: Firestore,
  options: { preferServer?: boolean } = {},
): Promise<SongIndexEntry[]> {
  const firestore = resolveDb(db);
  const read = options.preferServer
    ? getDocFromServer
    : async (ref: ReturnType<typeof doc>) => {
        try {
          return await getDoc(ref);
        } catch {
          return getDocFromServer(ref);
        }
      };

  const chunks = await Promise.all(
    chunkIds.map(async (chunkId) => {
      const ref = doc(firestore, "songIndex", chunkId);
      trackReads(`songIndex/${chunkId}`, 1);
      return read(ref);
    }),
  );

  return chunks
    .filter((snap) => snap.exists())
    .flatMap((snap) => (snap.data() as SongIndexChunk).entries);
}

/** Fetch all index chunks. Uses local cache first for instant paint, then server. */
export async function loadSongIndex(
  db?: Firestore,
  options: { preferServer?: boolean } = {},
): Promise<SongIndexEntry[]> {
  return loadSongIndexChunks(SONG_INDEX_CHUNK_IDS, db, options);
}

/** Write all index chunks from a flat entry list (re-chunks by title). */
export async function writeSongIndexEntries(
  entries: SongIndexEntry[],
  db?: Firestore,
): Promise<void> {
  if (entries.length > SONG_INDEX_CAPACITY) {
    throw new SongIndexCapacityError(entries.length);
  }

  const firestore = resolveDb(db);
  const chunks = buildIndexChunks(entries);
  const updatedAt = serverTimestamp();

  for (const [chunkId, chunkEntries] of chunks) {
    trackReads(`songIndex write ${chunkId}`, 1);
    await setDoc(doc(firestore, "songIndex", chunkId), {
      entries: chunkEntries,
      updatedAt,
    });
  }

  for (const chunkId of SONG_INDEX_CHUNK_IDS) {
    if (!chunks.has(chunkId)) {
      const chunkRef = doc(firestore, "songIndex", chunkId);
      const snap = await getDoc(chunkRef);
      if (snap.exists()) {
        await deleteDoc(chunkRef);
      }
    }
  }
}

/** Add or update a song — re-chunks across all index documents. */
export async function upsertSongIndexEntry(
  entry: SongIndexEntry,
  db?: Firestore,
): Promise<void> {
  const firestore = resolveDb(db);
  const existing = await loadSongIndex(firestore);
  await writeSongIndexEntries(mergeIndexEntry(existing, entry), firestore);
}

/** Remove a song from the index (e.g. on archive). */
export async function removeSongIndexEntry(
  songId: string,
  db?: Firestore,
): Promise<void> {
  const firestore = resolveDb(db);
  const existing = await loadSongIndex(firestore);
  await writeSongIndexEntries(
    existing.filter((entry) => entry.id !== songId),
    firestore,
  );
}

