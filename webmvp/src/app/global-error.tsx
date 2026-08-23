"use client";

import Link from "next/link";

import { formatError } from "@/lib/formatError";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-start justify-center gap-4 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p>{formatError(error)}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="min-h-11 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded border border-neutral-300 px-4 py-2 text-sm font-medium"
            >
              Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
