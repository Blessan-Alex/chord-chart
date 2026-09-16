/**
 * Rebuild songIndex from all active songs in Firestore.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json npm run rebuild-index
 */
import { FieldValue } from "firebase-admin/firestore";

import type { Key } from "../src/lib/engine";
import type { Section } from "../src/lib/types";
import {
  buildIndexChunks,
  songToIndexEntry,
  SONG_INDEX_CHUNK_IDS,
} from "../src/lib/firestore/songIndex";
import { getAdminDb } from "./admin";

export async function rebuildIndex(db = getAdminDb()): Promise<void> {
  const songsSnap = await db
    .collection("songs")
    .where("status", "==", "active")
    .get();

  const entries = songsSnap.docs.map((docSnap) => {
    const data = docSnap.data();
    return songToIndexEntry({
      id: docSnap.id,
      title: data.title as string,
      artist: data.artist as string | undefined,
      originalKey: data.originalKey as Key,
      tags: data.tags as string[] | undefined,
      sections: data.sections as Section[] | undefined,
      updatedAt: data.updatedAt as import("firebase/firestore").Timestamp,
      createdAt: data.createdAt as import("firebase/firestore").Timestamp,
    });
  });

  const chunks = buildIndexChunks(entries);
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (const [chunkId, chunkEntries] of chunks) {
    batch.set(db.collection("songIndex").doc(chunkId), {
      entries: chunkEntries,
      updatedAt: now,
    });
  }

  for (const chunkId of SONG_INDEX_CHUNK_IDS) {
    if (!chunks.has(chunkId)) {
      batch.delete(db.collection("songIndex").doc(chunkId));
    }
  }

  await batch.commit();
  console.log(
    `Rebuilt songIndex from ${entries.length} active song(s) across ${chunks.size} chunk(s).`,
  );
}

rebuildIndex().catch((error) => {
  console.error("rebuild-index failed:", error);
  process.exit(1);
});
