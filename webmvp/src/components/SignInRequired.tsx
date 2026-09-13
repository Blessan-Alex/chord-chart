"use client";

import Link from "next/link";

import { useAuth } from "@/lib/hooks/useAuth";

type SignInRequiredProps = {
  children: React.ReactNode;
};

export function SignInRequired({ children }: SignInRequiredProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-4">
        <p className="text-lf-text-tertiary">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 p-4">
        <h1 className="text-2xl font-semibold text-lf-text-primary">
          Sign in required
        </h1>
        <p className="text-lf-text-secondary">
          Playlists and groups are available to signed-in team members.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 font-medium text-lf-text-inverse hover:bg-lf-action-primary-hover"
        >
          Sign in
        </Link>
        <Link
          href="/"
          className="text-sm text-lf-text-secondary hover:text-lf-brand"
        >
          ← Home
        </Link>
      </main>
    );
  }

  return children;
}
