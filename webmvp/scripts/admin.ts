import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DEFAULT_PROJECT_ID = "song-db-5e4ed";

export function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      projectId:
        process.env.FIREBASE_PROJECT_ID ??
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
        DEFAULT_PROJECT_ID,
    });
  }

  return getFirestore();
}
