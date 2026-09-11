import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import type { Key } from "@/lib/engine";
import { getDb } from "@/lib/firebase";
import type { SessionSong, SessionSongData } from "@/lib/types";

const ORDER_STEP = 1000;

function resolveDb(db?: Firestore): Firestore {
  return db ?? getDb();
}

function mapSessionSong(snap: QueryDocumentSnapshot): SessionSong {
  return { id: snap.id, ...(snap.data() as SessionSongData) };
}

export function computeMidOrder(prevOrder: number, nextOrder: number): number {
  return (prevOrder + nextOrder) / 2;
}

export async function listSessionSongs(
  sessionId: string,
  db?: Firestore,
): Promise<SessionSong[]> {
  const snap = await getDocs(
    query(
      collection(resolveDb(db), "sessions", sessionId, "sessionSongs"),
      orderBy("order", "asc"),
    ),
  );
  return snap.docs.map(mapSessionSong);
}

export async function addSongToSession(
  sessionId: string,
  songId: string,
  songTitle: string,
  addedBy: string,
  db?: Firestore,
): Promise<void> {
  const firestore = resolveDb(db);

  await runTransaction(firestore, async (tx) => {
    const sessionRef = doc(firestore, "sessions", sessionId);
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists()) {
      throw new Error("Session not found");
    }

    const session = sessionSnap.data();
    const newOrder = ((session.songCount as number) + 1) * ORDER_STEP;
    const entryRef = doc(
      collection(firestore, "sessions", sessionId, "sessionSongs"),
    );

    tx.set(entryRef, {
      songId,
      songTitle,
      order: newOrder,
      keyOverride: null,
      notes: null,
      addedBy,
      addedAt: serverTimestamp(),
    });

    tx.update(sessionRef, {
      songCount: (session.songCount as number) + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function removeSongFromSession(
  sessionId: string,
  entryId: string,
  db?: Firestore,
): Promise<void> {
  const firestore = resolveDb(db);

  await runTransaction(firestore, async (tx) => {
    const sessionRef = doc(firestore, "sessions", sessionId);
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists()) {
      throw new Error("Session not found");
    }

    tx.delete(doc(firestore, "sessions", sessionId, "sessionSongs", entryId));
    tx.update(sessionRef, {
      songCount: Math.max(0, (sessionSnap.data().songCount as number) - 1),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function reorderSessionSong(
  sessionId: string,
  entryId: string,
  prevOrder: number,
  nextOrder: number,
  db?: Firestore,
): Promise<void> {
  const mid = computeMidOrder(prevOrder, nextOrder);
  await updateDoc(
    doc(resolveDb(db), "sessions", sessionId, "sessionSongs", entryId),
    { order: mid },
  );
}

export async function updateSessionSongKeyOverride(
  sessionId: string,
  entryId: string,
  keyOverride: Key | null,
  db?: Firestore,
): Promise<void> {
  await updateDoc(
    doc(resolveDb(db), "sessions", sessionId, "sessionSongs", entryId),
    { keyOverride },
  );
}

export async function recountSessionSongs(
  sessionId: string,
  db?: Firestore,
): Promise<void> {
  const firestore = resolveDb(db);
  const snap = await getDocs(
    collection(firestore, "sessions", sessionId, "sessionSongs"),
  );
  await updateDoc(doc(firestore, "sessions", sessionId), {
    songCount: snap.size,
    updatedAt: serverTimestamp(),
  });
}

/** Move entry up in the set list (1 write). */
export async function moveSessionSongUp(
  sessionId: string,
  songs: SessionSong[],
  index: number,
  db?: Firestore,
): Promise<void> {
  if (index <= 0) {
    return;
  }

  const current = songs[index];
  const prev = songs[index - 1];
  const beforePrev = index >= 2 ? songs[index - 2].order : 0;

  await reorderSessionSong(
    sessionId,
    current.id,
    beforePrev,
    prev.order,
    db,
  );
}

/** Move entry down in the set list (1 write). */
export async function moveSessionSongDown(
  sessionId: string,
  songs: SessionSong[],
  index: number,
  db?: Firestore,
): Promise<void> {
  if (index >= songs.length - 1) {
    return;
  }

  const current = songs[index];
  const next = songs[index + 1];
  const afterNext =
    index < songs.length - 2 ? songs[index + 2].order : next.order + ORDER_STEP;

  await reorderSessionSong(sessionId, current.id, next.order, afterNext, db);
}
