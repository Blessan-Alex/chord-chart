import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { normalizeSections, serializeSectionsForPublish } from "@/lib/chordMarks";
import { getDb } from "@/lib/firebase";
import {
  songToIndexEntry,
  upsertSongIndexEntry,
} from "@/lib/firestore/songIndex";
import { getSong } from "@/lib/firestore/songs";
import type {
  FirestoreSongData,
  SongEdit,
  SongEditData,
  UpdateSongEditInput,
} from "@/lib/types";
import { validateSong } from "@/lib/validation";

const SONG_EDITS_COLLECTION = "songEdits";
const MAX_ARCHIVED_VERSIONS = 10;

export class DraftVersionConflictError extends Error {
  constructor() {
    super("Song was modified since draft was created");
    this.name = "DraftVersionConflictError";
  }
}

function resolveDb(db?: Firestore): Firestore {
  return db ?? getDb();
}

function mapSongEdit(snap: QueryDocumentSnapshot): SongEdit {
  const data = snap.data() as SongEditData;
  return {
    id: snap.id,
    ...data,
    sections: normalizeSections(data.sections),
  };
}

function assertValidDraftInput(
  input: UpdateSongEditInput & { songId: string },
): void {
  if (
    input.title === undefined &&
    input.originalKey === undefined &&
    input.sections === undefined
  ) {
    return;
  }

  const result = validateSong({
    id: input.songId,
    title: input.title ?? "Draft",
    originalKey: input.originalKey ?? "C",
    sections: input.sections ?? [],
  });

  if (!result.ok) {
    throw new Error(result.errors.join("; "));
  }
}

export async function getSongEdit(
  editId: string,
  db?: Firestore,
): Promise<SongEdit | null> {
  const snap = await getDoc(
    doc(resolveDb(db), SONG_EDITS_COLLECTION, editId),
  );
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...(snap.data() as SongEditData) };
}

export async function getDraftForSong(
  songId: string,
  db?: Firestore,
): Promise<SongEdit | null> {
  const snap = await getDocs(
    query(
      collection(resolveDb(db), SONG_EDITS_COLLECTION),
      where("songId", "==", songId),
      where("status", "==", "draft"),
      limit(1),
    ),
  );

  const first = snap.docs[0];
  return first ? mapSongEdit(first) : null;
}

export async function listArchivedVersions(
  songId: string,
  db?: Firestore,
): Promise<SongEdit[]> {
  const snap = await getDocs(
    query(
      collection(resolveDb(db), SONG_EDITS_COLLECTION),
      where("songId", "==", songId),
      where("status", "==", "archived"),
    ),
  );

  return snap.docs
    .map(mapSongEdit)
    .sort((a, b) => {
      const aTime = a.publishedAt?.toMillis() ?? a.createdAt.toMillis();
      const bTime = b.publishedAt?.toMillis() ?? b.createdAt.toMillis();
      return bTime - aTime;
    })
    .slice(0, MAX_ARCHIVED_VERSIONS);
}

export async function createDraft(
  songId: string,
  editedBy: string,
  db?: Firestore,
): Promise<SongEdit> {
  const firestore = resolveDb(db);
  const existing = await getDraftForSong(songId, firestore);
  if (existing) {
    return existing;
  }

  const song = await getSong(songId, firestore);
  if (!song || song.status !== "active") {
    throw new Error(`Song not found: ${songId}`);
  }

  const ref = doc(collection(firestore, SONG_EDITS_COLLECTION));
  const data = {
    songId,
    status: "draft" as const,
    baseVersion: song.version,
    title: song.title,
    originalKey: song.originalKey,
    sections: normalizeSections(song.sections),
    notes: song.notes,
    version: song.version + 1,
    editedBy,
    createdAt: serverTimestamp(),
    publishedAt: null,
  };

  await setDoc(ref, data);

  const created = await getSongEdit(ref.id, firestore);
  if (!created) {
    throw new Error("Failed to read created draft");
  }
  return created;
}

export async function updateDraft(
  editId: string,
  patch: UpdateSongEditInput,
  db?: Firestore,
): Promise<void> {
  const firestore = resolveDb(db);
  const existing = await getSongEdit(editId, firestore);
  if (!existing || existing.status !== "draft") {
    throw new Error("Draft not found");
  }

  const normalizedSections =
    patch.sections !== undefined ? normalizeSections(patch.sections) : undefined;

  assertValidDraftInput({
    songId: existing.songId,
    title: patch.title ?? existing.title,
    originalKey: patch.originalKey ?? existing.originalKey,
    sections: normalizedSections ?? existing.sections,
  });

  const updates: Record<string, unknown> = {};
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.originalKey !== undefined) updates.originalKey = patch.originalKey;
  if (normalizedSections !== undefined) updates.sections = normalizedSections;
  if (patch.notes !== undefined) updates.notes = patch.notes;

  if (Object.keys(updates).length === 0) {
    return;
  }

  await updateDoc(doc(firestore, SONG_EDITS_COLLECTION, editId), updates);
}

export async function discardDraft(
  editId: string,
  db?: Firestore,
): Promise<void> {
  const firestore = resolveDb(db);
  const existing = await getSongEdit(editId, firestore);
  if (!existing || existing.status !== "draft") {
    throw new Error("Draft not found");
  }

  await deleteDoc(doc(firestore, SONG_EDITS_COLLECTION, editId));
}

export async function publishDraft(
  editId: string,
  editedBy: string,
  extras?: { artist?: string; tags?: string[] },
  db?: Firestore,
): Promise<string> {
  const firestore = resolveDb(db);
  let songId = "";

  await runTransaction(firestore, async (tx) => {
    const editRef = doc(firestore, SONG_EDITS_COLLECTION, editId);
    const editSnap = await tx.get(editRef);
    if (!editSnap.exists()) {
      throw new Error("Draft not found");
    }

    const edit = editSnap.data() as SongEditData;
    if (edit.status !== "draft") {
      throw new Error("Draft not found");
    }

    songId = edit.songId;

    const songRef = doc(firestore, "songs", edit.songId);
    const songSnap = await tx.get(songRef);
    if (!songSnap.exists()) {
      throw new Error(`Song not found: ${edit.songId}`);
    }

    const song = songSnap.data() as FirestoreSongData;
    if (song.version !== edit.baseVersion) {
      throw new DraftVersionConflictError();
    }

    const archiveRef = doc(collection(firestore, SONG_EDITS_COLLECTION));
    tx.set(archiveRef, {
      songId: edit.songId,
      status: "archived",
      baseVersion: song.version,
      title: song.title,
      originalKey: song.originalKey,
      sections: song.sections,
      notes: song.notes,
      version: song.version,
      editedBy,
      createdAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    });

    tx.update(songRef, {
      title: edit.title,
      originalKey: edit.originalKey,
      sections: serializeSectionsForPublish(edit.sections),
      notes: edit.notes,
      version: edit.version,
      ...(extras?.artist !== undefined ? { artist: extras.artist.trim() } : {}),
      ...(extras?.tags !== undefined ? { tags: extras.tags } : {}),
      updatedAt: serverTimestamp(),
    });

    tx.delete(editRef);
  });

  const archivesSnap = await getDocs(
    query(
      collection(firestore, SONG_EDITS_COLLECTION),
      where("songId", "==", songId),
      where("status", "==", "archived"),
    ),
  );
  const archives = archivesSnap.docs
    .map(mapSongEdit)
    .sort((a, b) => {
      const aTime = a.publishedAt?.toMillis() ?? a.createdAt.toMillis();
      const bTime = b.publishedAt?.toMillis() ?? b.createdAt.toMillis();
      return bTime - aTime;
    });
  const toDelete = archives.slice(MAX_ARCHIVED_VERSIONS);
  await Promise.all(
    toDelete.map((archive) =>
      deleteDoc(doc(firestore, SONG_EDITS_COLLECTION, archive.id)),
    ),
  );

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

  return songId;
}
