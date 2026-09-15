/**
 * Estimate songIndex chunk JSON sizes after building entries with searchText.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json npm run measure-index
 */
import type { Key } from "../src/lib/engine";
import {
  buildIndexChunks,
  songToIndexEntry,
  SONG_INDEX_CHUNK_IDS,
} from "../src/lib/firestore/songIndex";
import type { Section } from "../src/lib/types";
import { getAdminDb } from "./admin";

const WARN_BYTES = 900 * 1024;

function formatKiB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

export async function measureIndexSize(db = getAdminDb()): Promise<void> {
  const songsSnap = await db
    .collection("songs")
    .where("status", "==", "active")
    .get();

  const entries = songsSnap.docs.map((doc) =>
    songToIndexEntry({
      id: doc.id,
      title: doc.data().title as string,
      artist: doc.data().artist as string | undefined,
      originalKey: doc.data().originalKey as Key,
      tags: doc.data().tags as string[] | undefined,
      sections: doc.data().sections as Section[] | undefined,
    }),
  );

  const chunks = buildIndexChunks(entries);
  let maxBytes = 0;

  console.log(`Active songs: ${entries.length}`);
  console.log(`Index chunks: ${chunks.size} / ${SONG_INDEX_CHUNK_IDS.length}`);

  for (const chunkId of SONG_INDEX_CHUNK_IDS) {
    const chunkEntries = chunks.get(chunkId);
    if (!chunkEntries) {
      console.log(`${chunkId}: (empty)`);
      continue;
    }

    const payload = JSON.stringify({ entries: chunkEntries });
    const bytes = Buffer.byteLength(payload, "utf8");
    maxBytes = Math.max(maxBytes, bytes);

    const warn = bytes >= WARN_BYTES ? " WARNING: near Firestore 1 MiB limit" : "";
    console.log(
      `${chunkId}: ${chunkEntries.length} entries, ${formatKiB(bytes)}${warn}`,
    );
  }

  if (maxBytes >= WARN_BYTES) {
    console.warn(
      `\nOne or more chunks exceed ${formatKiB(WARN_BYTES)}. ` +
        "Lower SONG_INDEX_SEARCH_TEXT_MAX or add index chunks before scaling to 10k songs.",
    );
  } else {
    console.log(`\nLargest chunk: ${formatKiB(maxBytes)} (limit headroom OK).`);
  }
}

measureIndexSize().catch((error) => {
  console.error("measure-index failed:", error);
  process.exit(1);
});
