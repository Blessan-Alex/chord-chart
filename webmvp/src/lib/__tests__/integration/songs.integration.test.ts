import {
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, type Firestore } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  archiveSong,
  createSong,
  getSong,
  listSongs,
} from "@/lib/firestore/songs";

import {
  createRulesTestEnvironment,
  emulatorEnabled,
  sampleSongSections,
} from "./testEnv";

describe.skipIf(!emulatorEnabled).sequential("songs integration", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await createRulesTestEnvironment();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("creates, reads, lists, and archives a song", async () => {
    const adminDb = testEnv
      .authenticatedContext("admin-uid", { admin: true })
      .firestore() as unknown as Firestore;
    const musicianDb = testEnv
      .authenticatedContext("musician-uid")
      .firestore() as unknown as Firestore;

    const created = await createSong(
      {
        id: "test-song",
        title: "Test Song",
        originalKey: "C",
        sections: sampleSongSections,
      },
      "admin-uid",
      adminDb,
    );

    expect(created.id).toBe("test-song");
    expect(created.status).toBe("active");
    expect(created.createdAt).toBeDefined();

    const read = await getSong("test-song", musicianDb);
    expect(read?.title).toBe("Test Song");

    const page = await listSongs({ status: "active" }, adminDb);
    expect(page.songs.map((song) => song.id)).toContain("test-song");

    await archiveSong("test-song", adminDb);

    await expect(
      getDoc(doc(musicianDb, "songs", "test-song")),
    ).rejects.toThrow();
  });

  it("denies create for non-admin users", async () => {
    const musicianDb = testEnv
      .authenticatedContext("musician-uid")
      .firestore() as unknown as Firestore;

    await assertFails(
      createSong(
        {
          id: "blocked-song",
          title: "Blocked Song",
          originalKey: "G",
          sections: sampleSongSections,
        },
        "musician-uid",
        musicianDb,
      ),
    );
  });
});
