"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/hooks/useAuth";
import {
  USERNAME_ONBOARDING_PATH,
  getSafeRedirectPath,
} from "@/lib/safeRedirect";

function GateLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-lf-bg-page p-4">
      <p className="text-sm text-lf-text-secondary">Loading…</p>
    </main>
  );
}

/** Send signed-in users without a username to onboarding before using the app. */
export function UsernameGate({ children }: { children: ReactNode }) {
  const { user, loading, profileResolved, needsUsernameOnboarding } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const awaitingProfile = Boolean(user && !profileResolved);
  const mustRedirectToOnboarding =
    Boolean(user) &&
    profileResolved &&
    needsUsernameOnboarding &&
    !pathname.startsWith(USERNAME_ONBOARDING_PATH);

  useEffect(() => {
    if (!mustRedirectToOnboarding) {
      return;
    }

    const next = getSafeRedirectPath(pathname);
    const query = next ? `?next=${encodeURIComponent(next)}` : "";
    router.replace(`${USERNAME_ONBOARDING_PATH}${query}`);
  }, [mustRedirectToOnboarding, pathname, router]);

  if (loading || awaitingProfile || mustRedirectToOnboarding) {
    return <GateLoading />;
  }

  return children;
}
