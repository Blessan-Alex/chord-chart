/**
 * Seed preset songs + songIndex into Firestore (Admin SDK — bypasses rules).
 *
 * Production:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npm run seed
 *
 * Emulator:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed
 */
import { FieldValue } from "firebase-admin/firestore";

import { SONG_PRESETS } from "../src/data/presets";
import {
  buildIndexChunks,
  songToIndexEntry,
  SONG_INDEX_CHUNK_IDS,
} from "../src/lib/firestore/songIndex";
import { getAdminDb } from "./admin";

const SEED_USER_ID = process.env.SEED_USER_ID ?? "seed-admin";

async function seedSongs(): Promise<void> {
  const db = getAdminDb();
  const batch = db.batch();
  const indexEntries = [];

  for (const preset of SONG_PRESETS) {
    const data = {
      title: preset.title,
      artist: "",
      originalKey: preset.originalKey,
      status: "active",
      tempo: null,
      tags: [] as string[],
      sections: preset.sections,
      ccli: null,
      copyright: null,
      notes: null,
      version: 1,
      createdBy: SEED_USER_ID,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    batch.set(db.collection("songs").doc(preset.presetId), data);
    indexEntries.push(
      songToIndexEntry({
        id: preset.presetId,
        title: preset.title,
        originalKey: preset.originalKey,
      }),
    );
  }

  const chunks = buildIndexChunks(indexEntries);
  const now = FieldValue.serverTimestamp();

  for (const [chunkId, entries] of chunks) {
    batch.set(db.collection("songIndex").doc(chunkId), {
      entries,
      updatedAt: now,
    });
  }

  for (const chunkId of SONG_INDEX_CHUNK_IDS) {
    if (!chunks.has(chunkId)) {
      batch.delete(db.collection("songIndex").doc(chunkId));
    }
  }

  batch.set(db.collection("meta").doc("stats"), {
    totalSongs: SONG_PRESETS.length,
    schemaVersion: 1,
    lastUpdated: now,
  });

  await batch.commit();

  console.log(
    `Seeded ${SONG_PRESETS.length} songs and ${chunks.size} songIndex chunk(s).`,
  );
}

seedSongs().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
