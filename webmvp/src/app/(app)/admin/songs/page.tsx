"use client";

import Link from "next/link";
import { useEffect } from "react";

import { SignInRequired } from "@/components/SignInRequired";
import { ALL_KEYS, type Key } from "@/lib/engine";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePaginatedSongs } from "@/lib/hooks/usePaginatedSongs";

function isKey(value: string): value is Key {
  return (ALL_KEYS as readonly string[]).includes(value);
}

export default function AdminSongsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { songs, loading, error, hasMore, initialized, loadMore } =
    usePaginatedSongs();

  useEffect(() => {
    if (!authLoading && isAdmin && !initialized && !loading) {
      void loadMore();
    }
  }, [authLoading, isAdmin, initialized, loading, loadMore]);

  if (!authLoading && !isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4 sm:p-8">
        <h1 className="text-2xl font-semibold">Admin only</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Only admins can browse the full song library.
        </p>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Home
        </Link>
      </main>
    );
  }

  return (
    <SignInRequired>
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          ← Home
        </Link>

        <div>
          <h1 className="text-2xl font-semibold">All songs</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Paginated admin browser — use Home search for quick lookup.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {songs.length === 0 && !loading && initialized && (
          <p className="text-sm text-neutral-500">No active songs in Firestore.</p>
        )}

        {songs.length > 0 && (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {songs.map((song) => (
              <li key={song.id}>
                <Link
                  href={`/song/${song.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <span className="min-w-0 flex-1 font-medium">{song.title}</span>
                  <span className="shrink-0 text-sm text-neutral-500">
                    {isKey(song.originalKey) ? song.originalKey : song.originalKey}
                    {" · "}v{song.version}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void loadMore();
            }}
            className="rounded border border-neutral-300 px-4 py-3 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        )}

        {initialized && (
          <p className="text-xs text-neutral-400">
            Showing {songs.length} songs
            {hasMore ? " — more available" : ""}
          </p>
        )}
      </main>
    </SignInRequired>
  );
}
