import { type Firestore } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createSong } from "@/lib/firestore/songs";
import {
  addSongToSession,
  listSessionSongs,
  moveSessionSongDown,
} from "@/lib/firestore/sessionSongs";
import {
  createSession,
  getSession,
  updateSessionStatus,
} from "@/lib/firestore/sessions";

import {
  createRulesTestEnvironment,
  emulatorEnabled,
  sampleSongSections,
} from "./testEnv";

describe.skipIf(!emulatorEnabled).sequential("sessions integration", () => {
  let testEnv: Awaited<ReturnType<typeof createRulesTestEnvironment>>;
  let adminDb: Firestore;

  beforeAll(async () => {
    testEnv = await createRulesTestEnvironment();
    adminDb = testEnv
      .authenticatedContext("admin-uid", { admin: true })
      .firestore() as unknown as Firestore;
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("creates a session, adds songs, reorders, and publishes", async () => {
    await createSong(
      {
        id: "session-song-a",
        title: "Song A",
        originalKey: "C",
        sections: sampleSongSections,
      },
      "admin-uid",
      adminDb,
    );
    await createSong(
      {
        id: "session-song-b",
        title: "Song B",
        originalKey: "G",
        sections: sampleSongSections,
      },
      "admin-uid",
      adminDb,
    );

    const session = await createSession(
      {
        title: "Sunday Test",
        serviceType: "sunday_morning",
        date: new Date("2026-09-14T10:00:00"),
      },
      "admin-uid",
      "admin",
      adminDb,
    );

    await addSongToSession(
      session.id,
      "session-song-a",
      "Song A",
      "admin-uid",
      adminDb,
    );
    await addSongToSession(
      session.id,
      "session-song-b",
      "Song B",
      "admin-uid",
      adminDb,
    );

    let songs = await listSessionSongs(session.id, adminDb);
    expect(songs).toHaveLength(2);
    expect(songs[0]?.songId).toBe("session-song-a");

    await moveSessionSongDown(session.id, songs, 0, adminDb);
    songs = await listSessionSongs(session.id, adminDb);
    expect(songs[0]?.songId).toBe("session-song-b");

    await updateSessionStatus(session.id, "published", adminDb);
    const published = await getSession(session.id, adminDb);
    expect(published?.status).toBe("published");
    expect(published?.songCount).toBe(2);
  });
});
