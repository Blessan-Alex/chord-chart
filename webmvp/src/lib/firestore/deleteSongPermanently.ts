import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  type Firestore,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import { removeSongIndexEntry } from "@/lib/firestore/songIndex";
import { removeSongFromSession } from "@/lib/firestore/sessionSongs";

const SONGS_COLLECTION = "songs";
const SONG_EDITS_COLLECTION = "songEdits";

function resolveDb(db?: Firestore): Firestore {
  return db ?? getDb();
}

async function deleteSongEditsForSong(songId: string, db: Firestore): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, SONG_EDITS_COLLECTION),
      where("songId", "==", songId),
    ),
  );
  await Promise.all(snap.docs.map((editDoc) => deleteDoc(editDoc.ref)));
}

async function deleteSessionSongEntriesForSong(
  songId: string,
  db: Firestore,
): Promise<void> {
  const snap = await getDocs(
    query(collectionGroup(db, "sessionSongs"), where("songId", "==", songId)),
  );

  await Promise.all(
    snap.docs.map(async (entryDoc) => {
      const sessionId = entryDoc.ref.parent.parent?.id;
      if (!sessionId) {
        return;
      }
      await removeSongFromSession(sessionId, entryDoc.id, db);
    }),
  );
}

/** Permanently removes a song, its index entry, edits, and all playlist references. */
export async function deleteSongPermanently(
  songId: string,
  db?: Firestore,
): Promise<void> {
  const firestore = resolveDb(db);

  await deleteSessionSongEntriesForSong(songId, firestore);
  await deleteSongEditsForSong(songId, firestore);
  await removeSongIndexEntry(songId, firestore);

  const songRef = doc(firestore, SONGS_COLLECTION, songId);
  await deleteDoc(songRef);
}
