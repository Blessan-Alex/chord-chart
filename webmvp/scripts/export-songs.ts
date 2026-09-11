/**
 * Export all active songs to JSON (stdout).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json npm run export-songs > backup.json
 */
import { getAdminDb } from "./admin";

async function exportSongs(): Promise<void> {
  const db = getAdminDb();
  const snap = await db.collection("songs").where("status", "==", "active").get();

  const songs = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  process.stdout.write(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        count: songs.length,
        songs,
      },
      null,
      2,
    ),
  );
}

exportSongs().catch((error) => {
  console.error(error);
  process.exit(1);
});
