import { getPlaylistOwnerId } from "@/lib/firestore/sessions";
import type { GroupMemberInfo, Session } from "@/lib/types";

export function playlistAccessCount(session: Session): number {
  return 1 + (session.sharedWith?.length ?? 0);
}

export function buildPlaylistMemberList(session: Session): GroupMemberInfo[] {
  const ownerId = getPlaylistOwnerId(session);
  const owner: GroupMemberInfo = {
    uid: ownerId,
    username: session.ownerUsername,
    displayName: session.ownerUsername?.trim() || "Owner",
  };

  const byUid = new Map<string, GroupMemberInfo>();
  byUid.set(ownerId, owner);

  for (const member of session.sharedMembers ?? []) {
    if (member.uid !== ownerId) {
      byUid.set(member.uid, member);
    }
  }

  for (const uid of session.sharedWith ?? []) {
    if (uid !== ownerId && !byUid.has(uid)) {
      byUid.set(uid, { uid, displayName: "Member" });
    }
  }

  return [...byUid.values()];
}

export function playlistAccessLabel(count: number): string {
  return count === 1 ? "1 person with access" : `${count} people with access`;
}
