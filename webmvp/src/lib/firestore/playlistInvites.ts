import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";

import { getDb, getFirebaseAuth } from "@/lib/firebase";
import {
  generatePlaylistInviteToken,
  normalizeInviteToken,
} from "@/lib/playlistInviteToken";
import {
  getSession,
  isPlaylistOwner,
} from "@/lib/firestore/sessions";
import type { Session } from "@/lib/types";

const PLAYLIST_INVITE_TOKENS = "playlistInviteTokens";
const SESSIONS_COLLECTION = "sessions";

function resolveDb(db?: Firestore): Firestore {
  return db ?? getDb();
}

export async function createPlaylistInviteToken(
  session: Session,
  ownerId: string,
  db?: Firestore,
): Promise<string> {
  if (!isPlaylistOwner(session, ownerId)) {
    throw new Error("Only the playlist owner can create an invite link");
  }

  const firestore = resolveDb(db);
  const token = generatePlaylistInviteToken();
  const batch = writeBatch(firestore);

  batch.set(doc(firestore, PLAYLIST_INVITE_TOKENS, token), {
    sessionId: session.id,
    ownerId,
    title: session.title,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(firestore, SESSIONS_COLLECTION, session.id), {
    shareToken: token,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  return token;
}

export async function ensurePlaylistInviteToken(
  session: Session,
  ownerId: string,
  db?: Firestore,
): Promise<string> {
  if (!isPlaylistOwner(session, ownerId)) {
    throw new Error("Only the playlist owner can share this playlist");
  }

  if (session.shareToken) {
    const firestore = resolveDb(db);
    const existing = await getDoc(
      doc(firestore, PLAYLIST_INVITE_TOKENS, session.shareToken),
    );
    if (existing.exists()) {
      return session.shareToken;
    }
  }

  return createPlaylistInviteToken(session, ownerId, db);
}

export async function regeneratePlaylistInviteToken(
  session: Session,
  ownerId: string,
  db?: Firestore,
): Promise<string> {
  if (!isPlaylistOwner(session, ownerId)) {
    throw new Error("Only the playlist owner can reset the invite link");
  }

  const firestore = resolveDb(db);
  const batch = writeBatch(firestore);

  if (session.shareToken) {
    batch.delete(doc(firestore, PLAYLIST_INVITE_TOKENS, session.shareToken));
  }

  const token = generatePlaylistInviteToken();
  batch.set(doc(firestore, PLAYLIST_INVITE_TOKENS, token), {
    sessionId: session.id,
    ownerId,
    title: session.title,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(firestore, SESSIONS_COLLECTION, session.id), {
    shareToken: token,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return token;
}

/** Server-validated join — token required; no direct client writes to sharedWith. */
export async function joinPlaylistByInviteToken(
  tokenRaw: string,
): Promise<string> {
  const token = normalizeInviteToken(tokenRaw);
  if (token.length < 12) {
    throw new Error("Invalid invite link");
  }

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Sign in required");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/playlists/join", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const payload = (await response.json()) as { sessionId?: string; error?: string };
  if (!response.ok || !payload.sessionId) {
    throw new Error(payload.error ?? "Could not join playlist");
  }

  return payload.sessionId;
}

export async function getJoinedSession(
  sessionId: string,
  db?: Firestore,
): Promise<Session | null> {
  return getSession(sessionId, db);
}
