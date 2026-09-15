/**
 * Resolve Firebase authDomain for Google OAuth redirect URIs.
 *
 * Production uses NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN (e.g. lfchords.vercel.app) with
 * the /__/auth/ reverse proxy in next.config.ts.
 *
 * Local dev uses the Firebase-hosted handler so OAuth works without custom-domain setup.
 */
export function resolveFirebaseAuthDomain(options: {
  configured?: string;
  hostname: string;
  projectId?: string;
}): string {
  const configured = options.configured?.trim();
  const { hostname, projectId } = options;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return projectId ? `${projectId}.firebaseapp.com` : configured ?? "";
  }

  if (!configured) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required for production auth.",
    );
  }

  return configured;
}

/** Google OAuth redirect URI Firebase sends during redirect sign-in. */
export function firebaseAuthRedirectUri(authDomain: string): string {
  return `https://${authDomain}/__/auth/handler`;
}
