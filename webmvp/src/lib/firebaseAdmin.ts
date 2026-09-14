import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
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

function resolveServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Parameters<typeof cert>[0];
  } catch {
    console.error("[firebaseAdmin] Invalid FIREBASE_SERVICE_ACCOUNT_JSON");
    return null;
  }
}

export function getAdminApp(): App {
  if (getApps().length) {
    return getApps()[0]!;
  }

  const projectId = resolveProjectId();
  const serviceAccount = resolveServiceAccount();

  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  }

  // Local dev: Application Default Credentials (gcloud auth application-default login)
  return initializeApp({ projectId });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
