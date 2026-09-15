/** Resolve Firebase authDomain for same-origin redirect sign-in (see next.config rewrites). */
export function resolveFirebaseAuthDomain(options: {
  configured?: string;
  hostname: string;
  projectId?: string;
}): string {
  const configured = options.configured?.trim();
  const { hostname, projectId } = options;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    if (configured) {
      return configured;
    }
    return projectId ? `${projectId}.firebaseapp.com` : "";
  }

  return hostname;
}
