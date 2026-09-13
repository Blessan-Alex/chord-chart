import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import type { CreateUserProfileInput, UserProfile } from "@/lib/types";
import { userInitials } from "@/lib/userDisplay";
import { validateUsername } from "@/lib/validation";

const USERS_COLLECTION = "users";
const USERNAMES_COLLECTION = "usernames";

function resolveDb(db?: Firestore): Firestore {
  return db ?? getDb();
}

export async function isUsernameAvailable(
  usernameLower: string,
  db?: Firestore,
): Promise<boolean> {
  const validated = validateUsername(usernameLower);
  if (!validated.ok) {
    return false;
  }

  const firestore = resolveDb(db);
  const usernameRef = doc(firestore, USERNAMES_COLLECTION, validated.normalized);
  const usernameSnap = await getDoc(usernameRef);
  return !usernameSnap.exists();
}

export async function getUserProfile(
  uid: string,
  db?: Firestore,
): Promise<UserProfile | null> {
  const snap = await getDoc(doc(resolveDb(db), USERS_COLLECTION, uid));
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as UserProfile;
}

export async function createUserProfile(
  input: CreateUserProfileInput,
  db?: Firestore,
): Promise<void> {
  const usernameResult = validateUsername(input.username);
  if (!usernameResult.ok) {
    throw new Error(usernameResult.error);
  }

  const usernameLower = usernameResult.normalized;
  const displayName =
    input.displayName.trim() || input.email.split("@")[0] || "Musician";
  const firestore = resolveDb(db);

  if (!(await isUsernameAvailable(usernameLower, firestore))) {
    throw new Error("That username is already taken");
  }

  const batch = writeBatch(firestore);

  batch.set(doc(firestore, USERS_COLLECTION, input.uid), {
    email: input.email,
    displayName,
    username: usernameLower,
    usernameLower,
    role: "musician",
    avatarInitials: userInitials(displayName),
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  batch.set(doc(firestore, USERNAMES_COLLECTION, usernameLower), {
    uid: input.uid,
    usernameLower,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function updateUserDisplayName(
  uid: string,
  displayName: string,
  db?: Firestore,
): Promise<void> {
  const trimmed = displayName.trim();
  if (!trimmed) {
    throw new Error("Display name is required");
  }

  await updateDoc(doc(resolveDb(db), USERS_COLLECTION, uid), {
    displayName: trimmed,
    avatarInitials: userInitials(trimmed),
  });
}

export async function touchLastLogin(uid: string, db?: Firestore): Promise<void> {
  const ref = doc(resolveDb(db), USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return;
  }

  await updateDoc(ref, {
    lastLoginAt: serverTimestamp(),
  });
}
