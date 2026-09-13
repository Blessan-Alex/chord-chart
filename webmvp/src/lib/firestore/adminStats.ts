import { collection, getDocs, type Firestore } from "firebase/firestore";

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

export async function getAdminStats(db?: Firestore): Promise<AdminStats> {
  const firestore = resolveDb(db);
  const [indexEntries, sessionsSnap, groupsSnap] = await Promise.all([
    loadSongIndex(firestore),
    getDocs(collection(firestore, SESSIONS_COLLECTION)),
    getDocs(collection(firestore, GROUPS_COLLECTION)),
  ]);

  return {
    songCount: indexEntries.length,
    playlistCount: sessionsSnap.size,
    groupCount: groupsSnap.size,
  };
}
