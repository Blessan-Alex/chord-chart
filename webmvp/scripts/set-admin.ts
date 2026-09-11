/**
 * Grant admin custom claim to a Firebase Auth user.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npm run set-admin user@example.com
 */
import { getAuth } from "firebase-admin/auth";

import { getAdminDb } from "./admin";

async function setAdmin(): Promise<void> {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: npm run set-admin <email>");
    process.exit(1);
  }

  getAdminDb();
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);

  await auth.setCustomUserClaims(user.uid, { admin: true });

  console.log(`Admin claim set for ${email} (${user.uid})`);
  console.log("User must sign out and sign in again for the claim to apply.");
}

setAdmin().catch((error) => {
  console.error("set-admin failed:", error);
  process.exit(1);
});
