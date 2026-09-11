import { doc, getDoc, type Firestore } from "firebase/firestore";

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
        entry.artist.toLowerCase().includes(q) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(q)),
    )
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Fetch all index chunks once per session (1–5 reads). */
export async function loadSongIndex(db?: Firestore): Promise<SongIndexEntry[]> {
  const firestore = db ?? getDb();

  const chunks = await Promise.all(
    SONG_INDEX_CHUNK_IDS.map((chunkId) =>
      getDoc(doc(firestore, "songIndex", chunkId)),
    ),
  );

  return chunks
    .filter((snap) => snap.exists())
    .flatMap((snap) => (snap.data() as SongIndexChunk).entries);
}

/** @deprecated Use loadSongIndex */
export const fetchSongIndex = loadSongIndex;
