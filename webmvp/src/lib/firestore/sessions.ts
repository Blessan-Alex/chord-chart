import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  arrayUnion,
  writeBatch,
  type DocumentReference,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { PUBLISHED_PLAYLIST_CAP } from "@/lib/constants";
import { getDb } from "@/lib/firebase";
import { commitBatchedDeletes } from "@/lib/firestore/batchDelete";
import { generatePlaylistInviteToken } from "@/lib/playlistInviteToken";
import { resolveUsernameToUid } from "@/lib/firestore/users";
import { validateUsername } from "@/lib/validation";
import { listSessionSongs } from "@/lib/firestore/sessionSongs";
import type {
  CreateSessionInput,
  Session,
  SessionData,
  SessionStatus,
} from "@/lib/types";

const SESSIONS_COLLECTION = "sessions";
const PLAYLIST_INVITE_TOKENS = "playlistInviteTokens";

function resolveDb(db?: Firestore): Firestore {
  return db ?? getDb();
}

/** Run playlist queries independently so one failure does not block the rest. */
async function mergeSessionQueries(
  queries: Array<{ label: string; q: Query }>,
): Promise<Session[]> {
  const batches = await Promise.all(
    queries.map(async ({ label, q }) => {
      try {
        const snap = await getDocs(q);
        return snap.docs.map(mapSession);
      } catch (error) {
        console.warn(`[sessions] ${label} query failed:`, error);
        return [] as Session[];
      }
    }),
  );

  const byId = new Map<string, Session>();
  for (const sessions of batches) {
    for (const session of sessions) {
      byId.set(session.id, session);
    }
  }

  return [...byId.values()].sort(
    (a, b) => b.date.toMillis() - a.date.toMillis(),
  );
}

function sessionsRef(db?: Firestore) {
  return collection(resolveDb(db), SESSIONS_COLLECTION);
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

export function canViewPlaylist(
  session: Session,
  uid: string,
  isAdmin = false,
): boolean {
  return (
    session.status === "published" ||
    isPlaylistOwner(session, uid) ||
    session.sharedWith.includes(uid) ||
    isAdmin
  );
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

async function attachPlaylistInviteToken(
  sessionId: string,
  title: string,
  ownerId: string,
  db: Firestore,
): Promise<string> {
  const token = generatePlaylistInviteToken();
  const batch = writeBatch(db);
  batch.set(doc(db, PLAYLIST_INVITE_TOKENS, token), {
    sessionId,
    ownerId,
    title: title.trim(),
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, SESSIONS_COLLECTION, sessionId), {
    shareToken: token,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return token;
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

  await writeBatch(firestore).set(ref, data).commit();

  const created = await getSession(ref.id, firestore);
  if (!created) {
    throw new Error("Failed to read created playlist");
  }

  try {
    const shareToken = await attachPlaylistInviteToken(
      ref.id,
      input.title,
      createdBy,
      firestore,
    );
    return { ...created, shareToken };
  } catch (error) {
    console.warn("[sessions] invite token create failed:", error);
    return created;
  }
}

/** Playlists visible to a user: owned, shared, and recent band-published. */
export async function listPlaylistsForUser(
  uid: string,
  options: { publishedLimit?: number } = {},
  db?: Firestore,
): Promise<Session[]> {
  const publishedLimit = options.publishedLimit ?? PUBLISHED_PLAYLIST_CAP;
  const ref = sessionsRef(db);

  return mergeSessionQueries([
    {
      label: "owned-by-ownerId",
      q: query(ref, where("ownerId", "==", uid), orderBy("date", "desc")),
    },
    {
      label: "owned-by-createdBy",
      q: query(ref, where("createdBy", "==", uid), orderBy("date", "desc")),
    },
    {
      label: "shared-with",
      q: query(
        ref,
        where("sharedWith", "array-contains", uid),
        orderBy("date", "desc"),
      ),
    },
    {
      label: "published",
      q: query(
        ref,
        where("status", "==", "published"),
        orderBy("date", "desc"),
        limit(publishedLimit),
      ),
    },
  ]);
}

export async function listOwnedPlaylists(
  uid: string,
  db?: Firestore,
): Promise<Session[]> {
  const ref = sessionsRef(db);

  return mergeSessionQueries([
    {
      label: "owned-by-ownerId",
      q: query(ref, where("ownerId", "==", uid), orderBy("date", "desc")),
    },
    {
      label: "owned-by-createdBy",
      q: query(ref, where("createdBy", "==", uid), orderBy("date", "desc")),
    },
  ]);
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

export async function sharePlaylistByUsername(
  session: Session,
  usernameRaw: string,
  inviterUid: string,
  db?: Firestore,
): Promise<Session> {
  if (!isPlaylistOwner(session, inviterUid)) {
    throw new Error("Only the playlist owner can share");
  }

  const validated = validateUsername(usernameRaw);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const inviteeUid = await resolveUsernameToUid(validated.normalized, db);
  if (!inviteeUid) {
    throw new Error(
      `No user @${validated.normalized}. They need an account with that username in Profile.`,
    );
  }

  if (inviteeUid === inviterUid) {
    throw new Error("You cannot share with yourself");
  }

  if (session.sharedWith.includes(inviteeUid)) {
    throw new Error("That user already has access");
  }

  const firestore = resolveDb(db);
  await updateDoc(doc(firestore, SESSIONS_COLLECTION, session.id), {
    sharedWith: arrayUnion(inviteeUid),
    updatedAt: serverTimestamp(),
  });

  const updated = await getSession(session.id, firestore);
  if (!updated) {
    throw new Error("Playlist not found after sharing");
  }
  return updated;
}

export async function listPlaylistsForGroup(
  groupId: string,
  options: { limit?: number; strict?: boolean } = {},
  db?: Firestore,
): Promise<Session[]> {
  let q = query(
    sessionsRef(db),
    where("groupId", "==", groupId),
    orderBy("date", "desc"),
  );
  if (options.limit !== undefined) {
    q = query(q, limit(options.limit));
  }

  try {
    const snap = await getDocs(q);
    return snap.docs.map(mapSession);
  } catch (error) {
    if (options.strict) {
      throw error instanceof Error
        ? error
        : new Error("Could not load group playlists");
    }
    console.warn(`[sessions] group ${groupId} query failed:`, error);
    return [];
  }
}

type DeleteSessionOptions = {
  isAdmin?: boolean;
  /** Group owner deleting all playlists in a group cascade. */
  asGroupOwner?: boolean;
  /** Skip group playlistCount decrement (e.g. when deleting the whole group). */
  skipGroupCountUpdate?: boolean;
  db?: Firestore;
};

async function decrementGroupPlaylistCount(
  groupId: string,
  db: Firestore,
): Promise<void> {
  const groupRef = doc(db, "groups", groupId);
  const snap = await getDoc(groupRef);
  if (!snap.exists()) {
    return;
  }
  const current = (snap.data() as { playlistCount?: number }).playlistCount ?? 0;
  await updateDoc(groupRef, {
    playlistCount: Math.max(0, current - 1),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Permanently delete a playlist and related data (session songs, invite token).
 * Owner or admin only — enforced here and in Firestore rules.
 */
export async function deleteSession(
  session: Session,
  actorUid: string,
  options: DeleteSessionOptions = {},
): Promise<void> {
  const {
    isAdmin = false,
    asGroupOwner = false,
    skipGroupCountUpdate = false,
    db,
  } = options;

  const allowed =
    isAdmin ||
    isPlaylistOwner(session, actorUid) ||
    (asGroupOwner && Boolean(session.groupId));

  if (!allowed) {
    throw new Error("Only the playlist owner can delete this playlist");
  }

  const firestore = resolveDb(db);
  const sessionRef = doc(firestore, SESSIONS_COLLECTION, session.id);

  const songRefs = (
    await getDocs(collection(firestore, SESSIONS_COLLECTION, session.id, "sessionSongs"))
  ).docs.map((snap) => snap.ref);

  const refsToDelete: DocumentReference[] = [...songRefs];

  if (session.shareToken) {
    refsToDelete.push(
      doc(firestore, PLAYLIST_INVITE_TOKENS, session.shareToken),
    );
  }

  refsToDelete.push(sessionRef);
  await commitBatchedDeletes(firestore, refsToDelete);

  if (session.groupId && !skipGroupCountUpdate) {
    await decrementGroupPlaylistCount(session.groupId, firestore);
  }
}

/** Prefetch playlist doc + songs for offline use. */
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
