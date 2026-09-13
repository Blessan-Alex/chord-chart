import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import type {
  CreateGroupInput,
  Group,
  GroupData,
  GroupMemberInfo,
  UserProfile,
} from "@/lib/types";
import { resolveUsernameToUid } from "@/lib/firestore/users";
import { validateUsername } from "@/lib/validation";

const GROUPS_COLLECTION = "groups";
const GROUP_INVITE_CODES_COLLECTION = "groupInviteCodes";

function resolveDb(db?: Firestore): Firestore {
  return db ?? getDb();
}

function mapGroup(snap: QueryDocumentSnapshot): Group {
  const data = snap.data() as GroupData;
  return {
    id: snap.id,
    ...data,
    memberIds: data.memberIds ?? [],
    members: data.members ?? [],
    playlistCount: data.playlistCount ?? 0,
  };
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)] ?? "A";
  }
  return code;
}

function memberFromProfile(uid: string, profile: UserProfile | null): GroupMemberInfo {
  return {
    uid,
    username: profile?.username,
    displayName: profile?.displayName?.trim() || profile?.email?.split("@")[0] || "Musician",
  };
}

export function isGroupOwner(group: Group, uid: string): boolean {
  return group.ownerId === uid;
}

export function isGroupMember(group: Group, uid: string): boolean {
  return group.memberIds.includes(uid);
}

export async function getGroup(
  groupId: string,
  db?: Firestore,
): Promise<Group | null> {
  const snap = await getDoc(doc(resolveDb(db), GROUPS_COLLECTION, groupId));
  if (!snap.exists()) {
    return null;
  }
  return mapGroup(snap as QueryDocumentSnapshot);
}

export async function listGroupsForMember(
  uid: string,
  db?: Firestore,
): Promise<Group[]> {
  const snap = await getDocs(
    query(
      collection(resolveDb(db), GROUPS_COLLECTION),
      where("memberIds", "array-contains", uid),
      orderBy("name", "asc"),
    ),
  );
  return snap.docs.map(mapGroup);
}

export async function createGroup(
  input: CreateGroupInput,
  ownerId: string,
  ownerProfile: UserProfile | null,
  db?: Firestore,
): Promise<Group> {
  const firestore = resolveDb(db);
  const name = input.name.trim();
  if (!name) {
    throw new Error("Group name is required");
  }

  const groupRef = doc(collection(firestore, GROUPS_COLLECTION));
  const inviteCode = generateInviteCode();
  const owner = memberFromProfile(ownerId, ownerProfile);

  const data: Omit<GroupData, "createdAt" | "updatedAt"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
  } = {
    name,
    ownerId,
    ownerUsername: ownerProfile?.username,
    memberIds: [ownerId],
    members: [owner],
    inviteCode,
    playlistCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(firestore);
  batch.set(groupRef, data);
  batch.set(doc(firestore, GROUP_INVITE_CODES_COLLECTION, inviteCode), {
    groupId: groupRef.id,
    name,
    ownerId,
    createdAt: serverTimestamp(),
  });
  await batch.commit();

  const created = await getGroup(groupRef.id, firestore);
  if (!created) {
    throw new Error("Failed to read created group");
  }
  return created;
}

export async function joinGroupByInviteCode(
  inviteCodeRaw: string,
  uid: string,
  profile: UserProfile | null,
  db?: Firestore,
): Promise<Group> {
  const inviteCode = inviteCodeRaw.trim().toUpperCase();
  if (inviteCode.length !== 8) {
    throw new Error("Invite code must be 8 characters");
  }

  const firestore = resolveDb(db);
  const inviteSnap = await getDoc(
    doc(firestore, GROUP_INVITE_CODES_COLLECTION, inviteCode),
  );
  if (!inviteSnap.exists()) {
    throw new Error("Invalid invite code");
  }

  const groupId = inviteSnap.data().groupId as string;
  const groupRef = doc(firestore, GROUPS_COLLECTION, groupId);
  const existing = await getDoc(groupRef);

  if (existing.exists()) {
    const data = existing.data() as GroupData;
    if (data.memberIds?.includes(uid)) {
      return mapGroup(existing as QueryDocumentSnapshot);
    }
  }

  const member = memberFromProfile(uid, profile);

  await updateDoc(groupRef, {
    memberIds: arrayUnion(uid),
    members: arrayUnion(member),
    updatedAt: serverTimestamp(),
  });

  const joined = await getGroup(groupId, firestore);
  if (!joined) {
    throw new Error("Group not found after joining");
  }
  return joined;
}

export async function inviteGroupMemberByUsername(
  group: Group,
  usernameRaw: string,
  inviterUid: string,
  db?: Firestore,
): Promise<Group> {
  if (!isGroupOwner(group, inviterUid)) {
    throw new Error("Only the group owner can invite members");
  }

  const validated = validateUsername(usernameRaw);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const inviteeUid = await resolveUsernameToUid(validated.normalized, db);
  if (!inviteeUid) {
    throw new Error("Username not found");
  }

  if (group.memberIds.includes(inviteeUid)) {
    throw new Error("That user is already a member");
  }

  const firestore = resolveDb(db);
  const inviteeProfile = await getDoc(doc(firestore, "users", inviteeUid));
  const member = memberFromProfile(
    inviteeUid,
    inviteeProfile.exists() ? (inviteeProfile.data() as UserProfile) : null,
  );

  await updateDoc(doc(firestore, GROUPS_COLLECTION, group.id), {
    memberIds: arrayUnion(inviteeUid),
    members: arrayUnion(member),
    updatedAt: serverTimestamp(),
  });

  const updated = await getGroup(group.id, firestore);
  if (!updated) {
    throw new Error("Group not found after invite");
  }
  return updated;
}

export async function incrementGroupPlaylistCount(
  groupId: string,
  db?: Firestore,
): Promise<void> {
  const firestore = resolveDb(db);
  const groupRef = doc(firestore, GROUPS_COLLECTION, groupId);
  const snap = await getDoc(groupRef);
  if (!snap.exists()) {
    return;
  }
  const current = (snap.data() as GroupData).playlistCount ?? 0;
  await updateDoc(groupRef, {
    playlistCount: current + 1,
    updatedAt: serverTimestamp(),
  });
}
