"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ALL_KEYS, type Key } from "@/lib/engine";
import { loadSongIndex } from "@/lib/firestore/songIndex";
import { archiveSong } from "@/lib/firestore/songs";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSongSearch } from "@/lib/hooks/useSongSearch";
import { deleteSong, getSongs } from "@/lib/storage";
import type { Song, SongIndexEntry } from "@/lib/types";

function isKey(value: string): value is Key {
  return (ALL_KEYS as readonly string[]).includes(value);
}

export function HomePage() {
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const [savedSongs, setSavedSongs] = useState<Song[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [indexEntries, setIndexEntries] = useState<SongIndexEntry[]>([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [keyFilter, setKeyFilter] = useState<Key | "">("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
    source: "local" | "firestore";
  } | null>(null);

  const libraryResults = useSongSearch(
    indexEntries,
    searchQuery,
    keyFilter || undefined,
  );

  const refreshLocalSongs = useCallback(() => {
    setSavedSongs(getSongs().sort((a, b) => a.title.localeCompare(b.title)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (user) {
      return;
    }
    refreshLocalSongs();
  }, [user, refreshLocalSongs]);

  useEffect(() => {
    if (!user) {
      setIndexEntries([]);
      setIndexError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      setIndexLoading(true);
      setIndexError(null);

      try {
        const entries = await loadSongIndex();
        if (!cancelled) {
          setIndexEntries(entries);
        }
      } catch (error) {
        if (!cancelled) {
          setIndexError(
            error instanceof Error
              ? error.message
              : "Could not load song library.",
          );
        }
      } finally {
        if (!cancelled) {
          setIndexLoading(false);
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    try {
      if (pendingDelete.source === "local") {
        deleteSong(pendingDelete.id);
        refreshLocalSongs();
      } else {
        await archiveSong(pendingDelete.id);
        setIndexEntries((prev) =>
          prev.filter((entry) => entry.id !== pendingDelete.id),
        );
      }
    } catch (error) {
      setIndexError(
        error instanceof Error ? error.message : "Could not delete song.",
      );
    } finally {
      setPendingDelete(null);
    }
  };

  const showAddSong = !user || isAdmin;
  const totalSongs = user ? indexEntries.length : savedSongs.length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete song?"
        message={
          pendingDelete
            ? `"${pendingDelete.title}" will be removed from the library.`
            : ""
        }
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            LF ChordApp
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {authLoading || indexLoading ? "Loading…" : `${totalSongs} songs`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user && (
            <Link
              href="/sessions"
              className="inline-flex min-h-11 items-center justify-center rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Sessions
            </Link>
          )}
          {user ? (
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex min-h-11 items-center justify-center rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Sign in
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin/songs"
              className="inline-flex min-h-11 items-center justify-center rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              All songs
            </Link>
          )}

          {showAddSong && (
            <Link
              href="/import"
              className="inline-flex min-h-11 items-center justify-center rounded bg-black px-4 py-2 font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              + Add Song
            </Link>
          )}
        </div>
      </div>

      {user ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs…"
              className="min-h-11 flex-1 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
            />
            <select
              value={keyFilter}
              onChange={(e) => {
                const value = e.target.value;
                setKeyFilter(value && isKey(value) ? value : "");
              }}
              className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
            >
              <option value="">All keys</option>
              {ALL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          {indexError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {indexError}
            </p>
          )}

          {loaded && !indexLoading && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                Library
              </h2>
              {libraryResults.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  {indexEntries.length === 0
                    ? "No songs in the library yet."
                    : "No songs match your search."}
                </p>
              ) : (
                <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {libraryResults.map((entry) => (
                    <li
                      key={entry.id}
                      className="group flex items-stretch hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      <Link
                        href={`/song/${entry.id}`}
                        className="flex min-h-14 flex-1 items-center justify-between gap-3 px-4 py-4"
                      >
                        <span className="min-w-0 flex-1 break-words text-lg font-medium">
                          {entry.title}
                        </span>
                        <span className="shrink-0 text-sm text-neutral-500 dark:text-neutral-400">
                          {entry.key}
                        </span>
                      </Link>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({
                              id: entry.id,
                              title: entry.title,
                              source: "firestore",
                            })
                          }
                          className="px-6 text-neutral-400 transition-colors hover:text-red-600 dark:hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                          title="Delete song"
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          {loaded && savedSongs.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                Your Songs (this device)
              </h2>
              <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {savedSongs.map((song) => (
                  <li
                    key={song.id}
                    className="group flex items-stretch hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    <Link
                      href={`/song/${song.id}`}
                      className="flex min-h-14 flex-1 items-center justify-between gap-3 px-4 py-4"
                    >
                      <span className="min-w-0 flex-1 break-words text-lg font-medium">
                        {song.title}
                      </span>
                      <span className="shrink-0 text-sm text-neutral-500 dark:text-neutral-400">
                        {song.originalKey}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({
                          id: song.id,
                          title: song.title,
                          source: "local",
                        })
                      }
                      className="px-6 text-neutral-400 transition-colors hover:text-red-600 dark:hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                      title="Delete song"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            loaded && (
              <p className="text-sm text-neutral-500">
                Sign in to access the shared song library, or use{" "}
                <strong>+ Add Song</strong> to save charts on this device only.
              </p>
            )
          )}
        </div>
      )}
    </main>
  );
}
