"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SONG_PRESETS } from "@/data/presets";
import { ALL_KEYS, type Key } from "@/lib/engine";
import { loadSongIndex } from "@/lib/firestore/songIndex";
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

  const libraryResults = useSongSearch(
    indexEntries,
    searchQuery,
    keyFilter || undefined,
  );

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (confirm("Are you sure you want to delete this song?")) {
      deleteSong(id);
      setSavedSongs((prev) => prev.filter((s) => s.id !== id));
    }
  };

  useEffect(() => {
    if (user) {
      return;
    }

    setSavedSongs(getSongs().sort((a, b) => a.title.localeCompare(b.title)));
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIndexEntries([]);
      setIndexError(null);
      return;
    }

    let cancelled = false;
    setIndexLoading(true);
    setIndexError(null);

    loadSongIndex()
      .then((entries) => {
        if (!cancelled) {
          setIndexEntries(entries);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setIndexError(
            error instanceof Error
              ? error.message
              : "Could not load song library.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIndexLoading(false);
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const showAddSong = !user || isAdmin;
  const totalSongs = user
    ? indexEntries.length
    : SONG_PRESETS.length + savedSongs.length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
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
                  No songs match your search.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {libraryResults.map((entry) => (
                    <li key={entry.id}>
                      <Link
                        href={`/song/${entry.id}`}
                        className="flex min-h-14 items-center justify-between gap-3 px-4 py-4 hover:bg-neutral-50 active:bg-neutral-100 dark:hover:bg-neutral-900 dark:active:bg-neutral-800"
                      >
                        <span className="min-w-0 flex-1 break-words text-lg font-medium">
                          {entry.title}
                        </span>
                        <span className="shrink-0 text-sm text-neutral-500 dark:text-neutral-400">
                          {entry.key}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {loaded && savedSongs.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                Your Songs
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
                      onClick={(e) => handleDelete(e, song.id)}
                      className="px-6 text-neutral-400 transition-colors hover:text-red-600 dark:hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                      title="Delete song"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
              Presets
            </h2>
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {SONG_PRESETS.map((preset) => (
                <li key={preset.presetId}>
                  <Link
                    href={`/song/${preset.presetId}`}
                    className="flex min-h-14 items-center justify-between gap-3 px-4 py-4 hover:bg-neutral-50 active:bg-neutral-100 dark:hover:bg-neutral-900 dark:active:bg-neutral-800"
                  >
                    <span className="min-w-0 flex-1 break-words text-lg font-medium">
                      {preset.title}
                    </span>
                    <span className="shrink-0 text-sm text-neutral-500 dark:text-neutral-400">
                      {preset.originalKey}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
