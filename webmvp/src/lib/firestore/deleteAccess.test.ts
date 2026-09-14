import { describe, expect, it } from "vitest";

import { isGroupOwner } from "@/lib/firestore/groups";
import { isPlaylistOwner } from "@/lib/firestore/sessions";
import type { Group, Session } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

const now = Timestamp.now();

function sampleSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-1",
    title: "Sunday",
    serviceType: "sunday_morning",
    date: now,
    songCount: 0,
    status: "draft",
    createdBy: "owner-uid",
    ownerId: "owner-uid",
    sharedWith: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function sampleGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "group-1",
    name: "Band",
    ownerId: "owner-uid",
    memberIds: ["owner-uid"],
    members: [{ uid: "owner-uid", displayName: "Owner" }],
    inviteCode: "AB12CD34",
    playlistCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("delete access helpers", () => {
  it("identifies playlist owners including legacy createdBy", () => {
    expect(isPlaylistOwner(sampleSession(), "owner-uid")).toBe(true);
    expect(
      isPlaylistOwner(
        sampleSession({ ownerId: undefined, createdBy: "legacy-owner" }),
        "legacy-owner",
      ),
    ).toBe(true);
    expect(isPlaylistOwner(sampleSession(), "other-uid")).toBe(false);
  });

  it("identifies group owners", () => {
    expect(isGroupOwner(sampleGroup(), "owner-uid")).toBe(true);
    expect(isGroupOwner(sampleGroup(), "member-uid")).toBe(false);
  });
});
