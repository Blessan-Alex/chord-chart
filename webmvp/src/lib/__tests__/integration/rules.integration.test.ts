import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
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

  it("allows musician self-signup user doc", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await assertSucceeds(
      setDoc(doc(musicianDb, "users", "musician-uid"), {
        email: "musician@example.com",
        displayName: "Musician",
        role: "musician",
        createdAt: Timestamp.now(),
      }),
    );
  });

  it("denies musician elevating role to admin", async () => {
    const musicianDb = testEnv.authenticatedContext("musician-uid").firestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "musician-uid"), {
        email: "musician@example.com",
        displayName: "Musician",
        role: "musician",
        createdAt: Timestamp.now(),
      });
    });

    await assertFails(
      setDoc(doc(musicianDb, "users", "musician-uid"), {
        email: "musician@example.com",
        displayName: "Musician",
        role: "admin",
        createdAt: Timestamp.now(),
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
});
