import type { User } from "firebase/auth";

export const ADMIN_HOME_PATH = "/admin";

/** Only allow same-origin relative paths after login/signup. */
export function getSafeRedirectPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  return next;
}

/** Default landing path after auth — admins go to dashboard unless `next` is set. */
export function resolvePostAuthPath(
  nextPath: string | null,
  isAdmin: boolean,
): string {
  if (nextPath) {
    return nextPath;
  }
  return isAdmin ? ADMIN_HOME_PATH : "/";
}

export async function resolvePostAuthPathForUser(
  nextPath: string | null,
  user: User | null,
): Promise<string> {
  if (nextPath || !user) {
    return resolvePostAuthPath(nextPath, false);
  }

  const token = await user.getIdTokenResult();
  return resolvePostAuthPath(nextPath, token.claims.admin === true);
}
