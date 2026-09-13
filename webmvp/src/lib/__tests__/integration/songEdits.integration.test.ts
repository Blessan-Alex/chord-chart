import { doc, type Firestore, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createDraft,
  discardDraft,
  DraftVersionConflictError,
  getDraftForSong,
  listArchivedVersions,
  publishDraft,
  updateDraft,
} from "@/lib/firestore/songEdits";
import { createSong, getSong } from "@/lib/firestore/songs";

import {
  createRulesTestEnvironment,
  emulatorEnabled,
  sampleSongSections,
} from "./testEnv";

describe.skipIf(!emulatorEnabled).sequential("songEdits integration", () => {
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

  it("creates, updates, publishes, and archives a draft", async () => {
    await createSong(
      {
        id: "editable-song",
        title: "Editable Song",
        originalKey: "C",
        sections: sampleSongSections,
      },
      "admin-uid",
      adminDb,
    );

    const draft = await createDraft("editable-song", "admin-uid", adminDb);
    expect(draft.status).toBe("draft");
    expect(draft.baseVersion).toBe(1);
    expect(draft.version).toBe(2);

    await updateDraft(
      draft.id,
      {
        title: "Editable Song (edited)",
        sections: [
          {
            label: "Verse 1",
            lines: [
              {
                lyrics: "Updated line",
                chords: [{ chord: "G", position: 0 }],
              },
            ],
          },
        ],
      },
      adminDb,
    );

    await publishDraft(draft.id, "admin-uid", undefined, adminDb);

    const song = await getSong("editable-song", adminDb);
    expect(song?.title).toBe("Editable Song (edited)");
    expect(song?.version).toBe(2);

    const openDraft = await getDraftForSong("editable-song", adminDb);
    expect(openDraft).toBeNull();

    const archives = await listArchivedVersions("editable-song", adminDb);
    expect(archives).toHaveLength(1);
    expect(archives[0]?.title).toBe("Editable Song");
    expect(archives[0]?.version).toBe(1);
  });

  it("discards a draft without changing the song", async () => {
    await createSong(
      {
        id: "discard-song",
        title: "Discard Song",
        originalKey: "D",
        sections: sampleSongSections,
      },
      "admin-uid",
      adminDb,
    );

    const draft = await createDraft("discard-song", "admin-uid", adminDb);
    await discardDraft(draft.id, adminDb);

    const song = await getSong("discard-song", adminDb);
    expect(song?.title).toBe("Discard Song");
    expect(song?.version).toBe(1);
    expect(await getDraftForSong("discard-song", adminDb)).toBeNull();
  });

  it("throws on baseVersion conflict", async () => {
    await createSong(
      {
        id: "conflict-song",
        title: "Conflict Song",
        originalKey: "E",
        sections: sampleSongSections,
      },
      "admin-uid",
      adminDb,
    );

    const draft = await createDraft("conflict-song", "admin-uid", adminDb);
    await publishDraft(draft.id, "admin-uid", undefined, adminDb);

    const staleDraft = await createDraft("conflict-song", "admin-uid", adminDb);
    await updateDoc(doc(adminDb, "songEdits", staleDraft.id), {
      baseVersion: 1,
    });

    await expect(
      publishDraft(staleDraft.id, "admin-uid", undefined, adminDb),
    ).rejects.toBeInstanceOf(DraftVersionConflictError);
  });
});
