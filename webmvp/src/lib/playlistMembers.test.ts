import { describe, expect, it } from "vitest";

import type { Session } from "@/lib/types";

import {
  buildPlaylistMemberList,
  playlistAccessCount,
  playlistAccessLabel,
} from "./playlistMembers";

describe("playlistMembers", () => {
  const baseSession = {
    id: "session-1",
    title: "Sunday Set",
    serviceType: "sunday_morning" as const,
    date: { toMillis: () => 0 } as Session["date"],
    songCount: 3,
    status: "draft" as const,
    createdBy: "owner-uid",
    ownerId: "owner-uid",
    ownerUsername: "blessan",
    sharedWith: ["member-a", "member-b"],
    sharedMembers: [
      { uid: "member-a", username: "alex", displayName: "Alex" },
      { uid: "member-b", username: "sam", displayName: "Sam" },
    ],
    createdAt: { toMillis: () => 0 } as Session["createdAt"],
    updatedAt: { toMillis: () => 0 } as Session["updatedAt"],
  } satisfies Session;

  it("counts owner plus shared collaborators", () => {
    expect(playlistAccessCount(baseSession)).toBe(3);
  });

  it("labels access count", () => {
    expect(playlistAccessLabel(1)).toBe("1 person with access");
    expect(playlistAccessLabel(3)).toBe("3 people with access");
  });

  it("builds member list with owner first", () => {
    const members = buildPlaylistMemberList(baseSession);
    expect(members.map((member) => member.uid)).toEqual([
      "owner-uid",
      "member-a",
      "member-b",
    ]);
  });

  it("falls back to generic labels for legacy sharedWith uids", () => {
    const legacy: Session = {
      ...baseSession,
      sharedMembers: [],
    };
    const members = buildPlaylistMemberList(legacy);
    expect(members).toHaveLength(3);
    expect(members.find((member) => member.uid === "member-a")?.displayName).toBe(
      "Member",
    );
  });
});
