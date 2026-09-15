"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AppLogo } from "@/components/AppLogo";
import { formatAuthError } from "@/lib/authErrors";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getSafeRedirectPath,
  resolvePostAuthPath,
} from "@/lib/safeRedirect";
import { suggestUsername } from "@/lib/usernameSuggestions";
import { validateUsername } from "@/lib/validation";

function UsernameOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeRedirectPath(searchParams.get("next"));
  const { user, profile, loading, isAdmin, claimUsername, checkUsernameAvailable, signOut } =
    useAuth();

  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(
        nextPath
          ? `/login?next=${encodeURIComponent(nextPath)}`
          : "/login",
      );
    }
  }, [loading, user, router, nextPath]);

  useEffect(() => {
    if (!loading && user && profile?.username) {
      router.replace(resolvePostAuthPath(nextPath, isAdmin));
    }
  }, [loading, user, profile, isAdmin, router, nextPath]);

  useEffect(() => {
    if (username.trim() || !user) {
      return;
    }

    const suggestion = suggestUsername(user.email, user.displayName ?? profile?.displayName);
    if (suggestion) {
      setUsername(suggestion);
    }
  }, [user, profile?.displayName, username]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const result = validateUsername(username);
    if (!result.ok) {
      setUsernameError(result.error);
      return;
    }

    const available = await checkUsernameAvailable(result.normalized);
    if (!available) {
      setUsernameError("That username is already taken");
      return;
    }

    setUsernameError(null);
    setSubmitting(true);
    try {
      await claimUsername(result.normalized);
      router.replace(resolvePostAuthPath(nextPath, isAdmin));
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-lf-bg-page p-4">
        <p className="text-sm text-lf-text-secondary">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-lf-bg-page px-4 py-10">
      <div className="w-full max-w-md rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-6 shadow-sm">
        <div className="mb-6 flex justify-center">
          <AppLogo size="lg" />
        </div>

        <h1 className="text-center text-xl font-semibold text-lf-text-primary">
          Choose your @username
        </h1>
        <p className="mt-2 text-center text-sm text-lf-text-secondary">
          Required so others can find you and share playlists with you.
        </p>

        {user.displayName && (
          <p className="mt-4 text-center text-sm text-lf-text-secondary">
            Signed in as{" "}
            <span className="font-medium text-lf-text-primary">
              {user.displayName}
            </span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-lf-text-secondary">
              Username
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lf-text-tertiary">
                @
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setUsernameError(null);
                  setError(null);
                }}
                autoComplete="username"
                placeholder="yourname"
                className="min-h-12 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page py-2 pl-7 pr-3 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
              />
            </div>
            {usernameError && (
              <p className="text-sm text-lf-danger" role="alert">
                {usernameError}
              </p>
            )}
          </label>

          {error && (
            <p className="text-sm text-lf-danger" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || signingOut}
            className="min-h-12 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Continue"}
          </button>
        </form>

        <button
          type="button"
          disabled={submitting || signingOut}
          onClick={() => {
            void handleSignOut();
          }}
          className="mt-4 w-full text-center text-sm text-lf-text-secondary hover:text-lf-brand disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Use a different account"}
        </button>
      </div>
    </main>
  );
}

export default function UsernameOnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-lf-bg-page p-4">
          <p className="text-sm text-lf-text-secondary">Loading…</p>
        </main>
      }
    >
      <UsernameOnboardingContent />
    </Suspense>
  );
}
