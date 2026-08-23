"use client";

import Link from "next/link";
import { useEffect } from "react";

import { formatError } from "@/lib/formatError";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-start justify-center gap-4 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        {formatError(error)}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
