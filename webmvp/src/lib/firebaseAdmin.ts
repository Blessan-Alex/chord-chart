import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const DEFAULT_PROJECT_ID = "song-db-5e4ed";

function resolveProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    DEFAULT_PROJECT_ID
  );
}

export function getAdminApp(): App {
  if (getApps().length) {
    return getApps()[0]!;
  }

  return initializeApp({ projectId: resolveProjectId() });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
