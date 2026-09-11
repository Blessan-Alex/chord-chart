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
  return { id: snap.id, ...(snap.data() as SessionData) };
}

export async function getSession(
  sessionId: string,
  db?: Firestore,
): Promise<Session | null> {
  const snap = await getDoc(doc(resolveDb(db), SESSIONS_COLLECTION, sessionId));
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...(snap.data() as SessionData) };
}

export async function createSession(
  input: CreateSessionInput,
  createdBy: string,
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, data);

  const created = await getSession(ref.id, firestore);
  if (!created) {
    throw new Error("Failed to read created session");
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

/** Prefetch session doc + songs for offline use (P3-07). */
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
