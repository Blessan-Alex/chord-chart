import { collection, getCountFromServer, type Firestore } from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import { loadSongIndex } from "@/lib/firestore/songIndex";

const SESSIONS_COLLECTION = "sessions";
const GROUPS_COLLECTION = "groups";

function resolveDb(db?: Firestore): Firestore {
  return db ?? getDb();
}

export type AdminStats = {
  songCount: number;
  playlistCount: number;
  groupCount: number;
};

/** Admin dashboard counts — uses index length + count aggregations (not full scans). */
export async function getAdminStats(db?: Firestore): Promise<AdminStats> {
  const firestore = resolveDb(db);
  const sessionsRef = collection(firestore, SESSIONS_COLLECTION);
  const groupsRef = collection(firestore, GROUPS_COLLECTION);

  const [indexEntries, playlistCountSnap, groupCountSnap] = await Promise.all([
    loadSongIndex(firestore),
    getCountFromServer(sessionsRef),
    getCountFromServer(groupsRef),
  ]);

  return {
    songCount: indexEntries.length,
    playlistCount: playlistCountSnap.data().count,
    groupCount: groupCountSnap.data().count,
  };
}
