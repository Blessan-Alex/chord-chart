/**
 * Seed N synthetic active songs for load / index chunk testing.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json npx tsx scripts/seed-load-test.ts 1000
 */
import { getAdminDb } from "./admin";
import { rebuildIndex } from "./rebuild-index";

const count = Number(process.argv[2] ?? "100");

async function seedLoadTest(): Promise<void> {
  if (!Number.isFinite(count) || count < 1 || count > 10_000) {
    throw new Error("Usage: seed-load-test.ts <1-10000>");
  }

  const db = getAdminDb();
  const batchSize = 400;

  for (let start = 0; start < count; start += batchSize) {
    const batch = db.batch();
    const end = Math.min(start + batchSize, count);

    for (let i = start; i < end; i++) {
      const id = `load-test-${String(i).padStart(5, "0")}`;
      batch.set(db.collection("songs").doc(id), {
        title: `Load Test Song ${i}`,
        artist: "",
        originalKey: "C",
        status: "active",
        tempo: null,
        tags: [],
        sections: [
          {
            label: "Verse 1",
            lines: [{ lyrics: "Test line", chords: [{ chord: "C", position: 0 }] }],
          },
        ],
        ccli: null,
        copyright: null,
        notes: null,
        version: 1,
        createdBy: "seed-load-test",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await batch.commit();
    console.log(`Seeded songs ${start + 1}–${end}`);
  }

  await rebuildIndex(db);
  console.log(`Done. ${count} load-test songs seeded and index rebuilt.`);
}

seedLoadTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
