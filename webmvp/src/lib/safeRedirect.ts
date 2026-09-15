import type { User } from "firebase/auth";

import { getUserProfile } from "@/lib/firestore/users";
import type { UserProfile } from "@/lib/types";

export const ADMIN_HOME_PATH = "/admin";
export const USERNAME_ONBOARDING_PATH = "/onboarding/username";

/** Only allow same-origin relative paths after login/signup. */
export function getSafeRedirectPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  if (next.startsWith(USERNAME_ONBOARDING_PATH)) {
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

/** Route users with a loaded profile but no username through onboarding. */
export function resolvePostAuthDestination(
  nextPath: string | null,
  isAdmin: boolean,
  profile: UserProfile | null,
): string {
  if (profile && !profile.username) {
    if (nextPath) {
      return `${USERNAME_ONBOARDING_PATH}?next=${encodeURIComponent(nextPath)}`;
    }
    return USERNAME_ONBOARDING_PATH;
  }

  return resolvePostAuthPath(nextPath, isAdmin);
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

export async function resolvePostAuthDestinationForUser(
  nextPath: string | null,
  user: User | null,
): Promise<string> {
  if (!user) {
    return resolvePostAuthPath(nextPath, false);
  }

  const token = await user.getIdTokenResult();
  const isAdmin = token.claims.admin === true;
  let profile: UserProfile | null = null;

  try {
    profile = await getUserProfile(user.uid);
  } catch {
    profile = null;
  }

  return resolvePostAuthDestination(nextPath, isAdmin, profile);
}
