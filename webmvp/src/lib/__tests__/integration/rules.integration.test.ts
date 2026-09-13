import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

import {
  createRulesTestEnvironment,
  emulatorEnabled,
  sampleSongSections,
} from "./testEnv";

describe.skipIf(!emulatorEnabled).sequential("firestore rules integration", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await createRulesTestEnvironment();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "songs", "active-song"), {
        title: "Active Song",
        originalKey: "C",
        status: "active",
        sections: sampleSongSections,
        version: 1,
        createdBy: "admin-uid",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
  });

  it("denies anonymous song reads", async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(anonDb, "songs", "active-song")));
  });

  it("allows musician read of active songs", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await assertSucceeds(getDoc(doc(musicianDb, "songs", "active-song")));
  });

  it("denies musician song writes", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await assertFails(
      setDoc(doc(musicianDb, "songs", "new-song"), {
        title: "New Song",
        originalKey: "G",
        status: "active",
        sections: sampleSongSections,
      }),
    );
  });

  it("allows admin song writes with custom claim", async () => {
    const adminDb = testEnv
      .authenticatedContext("admin-uid", { admin: true })
      .firestore();

    await assertSucceeds(
      setDoc(doc(adminDb, "songs", "admin-song"), {
        title: "Admin Song",
        originalKey: "D",
        status: "active",
        sections: sampleSongSections,
      }),
    );
  });

  it("allows musician self-signup user doc with username", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await assertSucceeds(
      setDoc(doc(musicianDb, "users", "musician-uid"), {
        email: "musician@example.com",
        displayName: "Musician",
        username: "musician",
        usernameLower: "musician",
        role: "musician",
        avatarInitials: "MU",
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      }),
    );
  });

  it("allows legacy musician signup without username", async () => {
    const musicianDb = testEnv.authenticatedContext("legacy-uid").firestore();

    await assertSucceeds(
      setDoc(doc(musicianDb, "users", "legacy-uid"), {
        email: "legacy@example.com",
        displayName: "Legacy User",
        role: "musician",
        createdAt: Timestamp.now(),
      }),
    );
  });

  it("denies musician signup with admin role", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await assertFails(
      setDoc(doc(musicianDb, "users", "musician-uid"), {
        email: "musician@example.com",
        displayName: "Musician",
        username: "musician",
        usernameLower: "musician",
        role: "admin",
        avatarInitials: "MU",
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      }),
    );
  });

  it("denies musician elevating role to admin", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "musician-uid"), {
        email: "musician@example.com",
        displayName: "Musician",
        username: "musician",
        usernameLower: "musician",
        role: "musician",
        avatarInitials: "MU",
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      });
    });

    await assertFails(
      setDoc(doc(musicianDb, "users", "musician-uid"), {
        email: "musician@example.com",
        displayName: "Musician",
        username: "musician",
        usernameLower: "musician",
        role: "admin",
        avatarInitials: "MU",
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      }),
    );
  });

  it("denies musician changing username", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "musician-uid"), {
        email: "musician@example.com",
        displayName: "Musician",
        username: "musician",
        usernameLower: "musician",
        role: "musician",
        avatarInitials: "MU",
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      });
    });

    await assertFails(
      setDoc(doc(musicianDb, "users", "musician-uid"), {
        email: "musician@example.com",
        displayName: "Musician",
        username: "othername",
        usernameLower: "othername",
        role: "musician",
        avatarInitials: "MU",
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      }),
    );
  });

  it("denies musician read of songEdits", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await assertFails(getDoc(doc(musicianDb, "songEdits", "draft-1")));
  });

  it("allows authenticated read of songIndex", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "songIndex", "chunk0"), {
        entries: [],
        updatedAt: Timestamp.now(),
      });
    });

    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();
    await assertSucceeds(getDoc(doc(musicianDb, "songIndex", "chunk0")));
  });

  it("allows public username availability lookup", async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anonDb, "usernames", "available-name")));
  });

  it("allows authed user to reserve username doc", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await assertSucceeds(
      setDoc(doc(musicianDb, "usernames", "musician"), {
        uid: "musician-uid",
        usernameLower: "musician",
        createdAt: Timestamp.now(),
      }),
    );
  });

  it("denies reserving username for another uid", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await assertFails(
      setDoc(doc(musicianDb, "usernames", "musician"), {
        uid: "someone-else",
        usernameLower: "musician",
        createdAt: Timestamp.now(),
      }),
    );
  });

  it("allows musician to create own playlist", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await assertSucceeds(
      setDoc(doc(musicianDb, "sessions", "playlist-1"), {
        title: "My Set",
        serviceType: "sunday_morning",
        date: Timestamp.now(),
        songCount: 0,
        status: "draft",
        createdBy: "musician-uid",
        ownerId: "musician-uid",
        ownerUsername: "musician",
        sharedWith: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("denies musician creating playlist for another owner", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await assertFails(
      setDoc(doc(musicianDb, "sessions", "playlist-2"), {
        title: "Stolen Set",
        serviceType: "sunday_morning",
        date: Timestamp.now(),
        songCount: 0,
        status: "draft",
        createdBy: "musician-uid",
        ownerId: "other-uid",
        sharedWith: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("denies stranger updating another users playlist", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "sessions", "owned-playlist"), {
        title: "Owned",
        serviceType: "sunday_morning",
        date: Timestamp.now(),
        songCount: 0,
        status: "draft",
        createdBy: "owner-uid",
        ownerId: "owner-uid",
        sharedWith: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    const strangerDb = testEnv.authenticatedContext("stranger-uid").firestore();

    await assertFails(
      setDoc(
        doc(strangerDb, "sessions", "owned-playlist"),
        {
          title: "Hijacked",
          serviceType: "sunday_morning",
          date: Timestamp.now(),
          songCount: 0,
          status: "draft",
          createdBy: "owner-uid",
          ownerId: "owner-uid",
          sharedWith: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      ),
    );
  });

  it("allows shared user to read draft playlist", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "sessions", "shared-playlist"), {
        title: "Shared",
        serviceType: "sunday_morning",
        date: Timestamp.now(),
        songCount: 0,
        status: "draft",
        createdBy: "owner-uid",
        ownerId: "owner-uid",
        sharedWith: ["guest-uid"],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    const guestDb = testEnv.authenticatedContext("guest-uid").firestore();
    await assertSucceeds(getDoc(doc(guestDb, "sessions", "shared-playlist")));
  });

  it("allows admin to delete any playlist", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "sessions", "delete-me"), {
        title: "Delete Me",
        serviceType: "sunday_morning",
        date: Timestamp.now(),
        songCount: 0,
        status: "published",
        createdBy: "owner-uid",
        ownerId: "owner-uid",
        sharedWith: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    const adminDb = testEnv
      .authenticatedContext("admin-uid", { admin: true })
      .firestore();

    await assertSucceeds(deleteDoc(doc(adminDb, "sessions", "delete-me")));
  });
});
