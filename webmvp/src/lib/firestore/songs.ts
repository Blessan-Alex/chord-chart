import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type DocumentSnapshot,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import type { Key } from "@/lib/engine";
import { getDb } from "@/lib/firebase";
import { trackReads } from "@/lib/readCounter";
import {
  removeSongIndexEntry,
  songToIndexEntry,
  upsertSongIndexEntry,
} from "@/lib/firestore/songIndex";
import type {
  CreateSongInput,
  FirestoreSong,
  FirestoreSongData,
  SongStatus,
  UpdateSongInput,
} from "@/lib/types";
import { validateSong } from "@/lib/validation";

const SONGS_COLLECTION = "songs";
const PAGE_SIZE = 20;

import { resolveSongId } from "@/lib/songId";

function toFirestoreSong(
  id: string,
  data: FirestoreSongData,
): FirestoreSong {
  return { id, ...data };
}

function mapSnapshot(snap: QueryDocumentSnapshot): FirestoreSong {
  return toFirestoreSong(snap.id, snap.data() as FirestoreSongData);
}

function assertValidSongInput(
  input: CreateSongInput | (UpdateSongInput & { id: string }),
): void {
  const result = validateSong({
    id: input.id ?? "draft",
    title: input.title ?? "",
    originalKey: input.originalKey ?? "C",
    sections: input.sections ?? [],
  });

  if (!result.ok) {
    throw new Error(result.errors.join("; "));
  }
}

function resolveDb(db?: Firestore): Firestore {
  return db ?? getDb();
}

/** Song detail — server when online, cache fallback when offline. */
export async function getSong(
  songId: string,
  db?: Firestore,
): Promise<FirestoreSong | null> {
  const ref = doc(resolveDb(db), SONGS_COLLECTION, songId);

  try {
    trackReads(`songs/${songId}`, 1);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return toFirestoreSong(snap.id, snap.data() as FirestoreSongData);
  } catch {
    try {
      trackReads(`songs/${songId} (cache)`, 1);
      const cached = await getDocFromCache(ref);
      if (cached.exists()) {
        return toFirestoreSong(cached.id, cached.data() as FirestoreSongData);
      }
    } catch {
      // No cache entry.
    }
    return null;
  }
}

export async function createSong(
  input: CreateSongInput,
  createdBy: string,
  db?: Firestore,
): Promise<FirestoreSong> {
  assertValidSongInput(input);

  const id = resolveSongId(input.title, input.id);

  const data = {
    title: input.title.trim(),
    artist: input.artist?.trim() ?? "",
    originalKey: input.originalKey,
    status: "active" as const,
    tempo: input.tempo ?? null,
    tags: input.tags ?? [],
    sections: input.sections,
    ccli: input.ccli ?? null,
    copyright: input.copyright ?? null,
    notes: input.notes ?? null,
    version: 1,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const firestore = resolveDb(db);
  const ref = doc(firestore, SONGS_COLLECTION, id);
  await setDoc(ref, data);
  await upsertSongIndexEntry(songToIndexEntry({ ...data, id }), firestore);

  const created = await getSong(id, firestore);
  if (!created) {
    throw new Error(`Failed to read created song: ${id}`);
  }

  return created;
}

export async function updateSong(
  songId: string,
  patch: UpdateSongInput,
  db?: Firestore,
): Promise<void> {
  if (
    patch.title !== undefined ||
    patch.originalKey !== undefined ||
    patch.sections !== undefined
  ) {
    const existing = await getSong(songId, db);
    if (!existing) {
      throw new Error(`Song not found: ${songId}`);
    }

    assertValidSongInput({
      id: songId,
      title: patch.title ?? existing.title,
      originalKey: patch.originalKey ?? existing.originalKey,
      sections: patch.sections ?? existing.sections,
    });
  }

  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.artist !== undefined) updates.artist = patch.artist.trim();
  if (patch.originalKey !== undefined) updates.originalKey = patch.originalKey;
  if (patch.tempo !== undefined) updates.tempo = patch.tempo;
  if (patch.tags !== undefined) updates.tags = patch.tags;
  if (patch.sections !== undefined) updates.sections = patch.sections;
  if (patch.ccli !== undefined) updates.ccli = patch.ccli;
  if (patch.copyright !== undefined) updates.copyright = patch.copyright;
  if (patch.notes !== undefined) updates.notes = patch.notes;

  const firestore = resolveDb(db);
  await updateDoc(doc(firestore, SONGS_COLLECTION, songId), updates);

  if (
    patch.title !== undefined ||
    patch.artist !== undefined ||
    patch.originalKey !== undefined ||
    patch.tags !== undefined ||
    patch.sections !== undefined
  ) {
    const song = await getSong(songId, firestore);
    if (song) {
      await upsertSongIndexEntry(
        songToIndexEntry({
          id: song.id,
          title: song.title,
          artist: song.artist,
          originalKey: song.originalKey,
          tags: song.tags,
          sections: song.sections,
        }),
        firestore,
      );
    }
  }
}

/** Soft-delete — keeps session references intact. */
export async function archiveSong(songId: string, db?: Firestore): Promise<void> {
  const firestore = resolveDb(db);
  await updateDoc(doc(firestore, SONGS_COLLECTION, songId), {
    status: "archived",
    updatedAt: serverTimestamp(),
  });
  await removeSongIndexEntry(songId, firestore);
}

export type ListSongsOptions = {
  status?: SongStatus;
  originalKey?: Key;
  pageSize?: number;
  startAfterDoc?: DocumentSnapshot;
};

export type ListSongsResult = {
  songs: FirestoreSong[];
  lastDoc: QueryDocumentSnapshot | null;
};

/** Paginated admin browser — not used for library search. */
export async function listSongs(
  options: ListSongsOptions = {},
  db?: Firestore,
): Promise<ListSongsResult> {
  const status = options.status ?? "active";
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const collectionRef = collection(resolveDb(db), SONGS_COLLECTION);

  let q;

  if (options.originalKey) {
    q = query(
      collectionRef,
      where("originalKey", "==", options.originalKey),
      orderBy("createdAt", "desc"),
      limit(pageSize),
    );
  } else {
    q = query(
      collectionRef,
      where("status", "==", status),
      orderBy("createdAt", "desc"),
      limit(pageSize),
    );
  }

  if (options.startAfterDoc) {
    q = query(q, startAfter(options.startAfterDoc));
  }

  const snap = await getDocs(q);
  const songs = snap.docs
    .map(mapSnapshot)
    .filter((song) => song.status === status);
  const lastDoc = snap.docs.at(-1) ?? null;

  return { songs, lastDoc };
}
