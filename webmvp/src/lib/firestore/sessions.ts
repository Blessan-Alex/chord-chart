import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import { listSessionSongs } from "@/lib/firestore/sessionSongs";
import type {
  CreateSessionInput,
  Session,
  SessionData,
  SessionStatus,
} from "@/lib/types";

const SESSIONS_COLLECTION = "sessions";

function resolveDb(db?: Firestore): Firestore {
  return db ?? getDb();
}

function mapSession(snap: QueryDocumentSnapshot): Session {
  const data = snap.data() as SessionData;
  return {
    id: snap.id,
    ...data,
    ownerId: data.ownerId ?? data.createdBy,
    sharedWith: data.sharedWith ?? [],
  };
}

export function getPlaylistOwnerId(session: Session): string {
  return session.ownerId ?? session.createdBy;
}

export function isPlaylistOwner(session: Session, uid: string): boolean {
  return getPlaylistOwnerId(session) === uid;
}

export async function getSession(
  sessionId: string,
  db?: Firestore,
): Promise<Session | null> {
  const snap = await getDoc(doc(resolveDb(db), SESSIONS_COLLECTION, sessionId));
  if (!snap.exists()) {
    return null;
  }
  return mapSession(snap as QueryDocumentSnapshot);
}

export async function createSession(
  input: CreateSessionInput,
  createdBy: string,
  ownerUsername?: string,
  db?: Firestore,
): Promise<Session> {
  const firestore = resolveDb(db);
  const ref = doc(collection(firestore, SESSIONS_COLLECTION));

  const data = {
    title: input.title.trim(),
    serviceType: input.serviceType,
    date: Timestamp.fromDate(input.date),
    songCount: 0,
    status: input.status ?? "draft",
    createdBy,
    ownerId: createdBy,
    ownerUsername: ownerUsername?.trim() ?? "",
    sharedWith: [] as string[],
    ...(input.groupId ? { groupId: input.groupId } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, data);

  const created = await getSession(ref.id, firestore);
  if (!created) {
    throw new Error("Failed to read created playlist");
  }
  return created;
}

export async function listSessions(
  options: { status?: SessionStatus } = {},
  db?: Firestore,
): Promise<Session[]> {
  const firestore = resolveDb(db);
  const status = options.status ?? "published";

  const snap = await getDocs(
    query(
      collection(firestore, SESSIONS_COLLECTION),
      where("status", "==", status),
      orderBy("date", "desc"),
    ),
  );

  return snap.docs.map(mapSession);
}

/** Playlists visible to a user: owned, shared, and band-published. */
export async function listPlaylistsForUser(
  uid: string,
  db?: Firestore,
): Promise<Session[]> {
  const firestore = resolveDb(db);
  const sessionsRef = collection(firestore, SESSIONS_COLLECTION);

  const [ownedByIdSnap, ownedLegacySnap, sharedSnap, publishedSnap] =
    await Promise.all([
      getDocs(
        query(
          sessionsRef,
          where("ownerId", "==", uid),
          orderBy("date", "desc"),
        ),
      ),
      getDocs(
        query(
          sessionsRef,
          where("createdBy", "==", uid),
          orderBy("date", "desc"),
        ),
      ),
      getDocs(
        query(
          sessionsRef,
          where("sharedWith", "array-contains", uid),
          orderBy("date", "desc"),
        ),
      ),
      getDocs(
        query(
          sessionsRef,
          where("status", "==", "published"),
          orderBy("date", "desc"),
        ),
      ),
    ]);

  const byId = new Map<string, Session>();
  for (const snap of [
    ...ownedByIdSnap.docs,
    ...ownedLegacySnap.docs,
    ...sharedSnap.docs,
    ...publishedSnap.docs,
  ]) {
    byId.set(snap.id, mapSession(snap));
  }

  return [...byId.values()].sort(
    (a, b) => b.date.toMillis() - a.date.toMillis(),
  );
}

export async function listOwnedPlaylists(
  uid: string,
  db?: Firestore,
): Promise<Session[]> {
  const all = await listPlaylistsForUser(uid, db);
  return all.filter((session) => isPlaylistOwner(session, uid));
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  db?: Firestore,
): Promise<void> {
  await updateDoc(doc(resolveDb(db), SESSIONS_COLLECTION, sessionId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Prefetch playlist doc + songs for offline use. */
export async function listPlaylistsForGroup(
  groupId: string,
  db?: Firestore,
): Promise<Session[]> {
  const snap = await getDocs(
    query(
      collection(resolveDb(db), SESSIONS_COLLECTION),
      where("groupId", "==", groupId),
      orderBy("date", "desc"),
    ),
  );
  return snap.docs.map(mapSession);
}

export async function cacheSessionOffline(
  sessionId: string,
  db?: Firestore,
): Promise<void> {
  const firestore = resolveDb(db);
  await getDocFromServer(doc(firestore, SESSIONS_COLLECTION, sessionId));
  const entries = await listSessionSongs(sessionId, firestore);
  await Promise.all(
    entries.map((entry) =>
      getDocFromServer(doc(firestore, "songs", entry.songId)),
    ),
  );
}
