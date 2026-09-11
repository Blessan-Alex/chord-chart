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
        <p className="text-neutral-400">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 p-4">
        <h1 className="text-2xl font-semibold">Sign in required</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Sessions are available to signed-in team members.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-11 w-fit items-center justify-center rounded bg-black px-4 py-2 font-medium text-white dark:bg-white dark:text-black"
        >
          Sign in
        </Link>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Home
        </Link>
      </main>
    );
  }

  return children;
}
