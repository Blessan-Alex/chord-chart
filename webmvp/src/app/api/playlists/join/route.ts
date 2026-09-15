import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { normalizeInviteToken } from "@/lib/playlistInviteToken";

const PLAYLIST_INVITE_TOKENS = "playlistInviteTokens";
const SESSIONS_COLLECTION = "sessions";
const USERS_COLLECTION = "users";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { token?: string };
    const token = normalizeInviteToken(body.token ?? "");
    if (token.length < 12) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 400 });
    }

    const idToken = authHeader.slice("Bearer ".length);
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = getAdminDb();
    const inviteRef = db.collection(PLAYLIST_INVITE_TOKENS).doc(token);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      return NextResponse.json(
        { error: "This invite link is invalid or has expired" },
        { status: 404 },
      );
    }

    const sessionId = inviteSnap.data()?.sessionId;
    if (typeof sessionId !== "string") {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    }

    const sessionRef = db.collection(SESSIONS_COLLECTION).doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const session = sessionSnap.data()!;
    const ownerId = session.ownerId ?? session.createdBy;
    const sharedWith: string[] = session.sharedWith ?? [];

    if (ownerId === uid || sharedWith.includes(uid)) {
      return NextResponse.json({ sessionId });
    }

    const userSnap = await db.collection(USERS_COLLECTION).doc(uid).get();
    const userData = userSnap.data();
    const member = {
      uid,
      username: typeof userData?.username === "string" ? userData.username : undefined,
      displayName:
        (typeof userData?.displayName === "string" && userData.displayName.trim()) ||
        (typeof userData?.email === "string" && userData.email.split("@")[0]) ||
        "Musician",
    };

    await sessionRef.update({
      sharedWith: FieldValue.arrayUnion(uid),
      sharedMembers: FieldValue.arrayUnion(member),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error("[api/playlists/join]", error);
    return NextResponse.json({ error: "Could not join playlist" }, { status: 500 });
  }
}
