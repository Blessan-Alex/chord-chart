"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SONG_PRESETS } from "@/data/presets";
import { getSongs, deleteSong } from "@/lib/storage";
import type { Song } from "@/lib/types";

export function HomePage() {
  const [savedSongs, setSavedSongs] = useState<Song[]>([]);
  const [loaded, setLoaded] = useState(false);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (confirm("Are you sure you want to delete this song?")) {
      deleteSong(id);
      setSavedSongs((prev) => prev.filter((s) => s.id !== id));
    }
  };

  useEffect(() => {
    setSavedSongs(getSongs().sort((a, b) => a.title.localeCompare(b.title)));
    setLoaded(true);
  }, []);

  const totalSongs = SONG_PRESETS.length + savedSongs.length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            LF ChordApp
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {totalSongs} songs
          </p>
        </div>
        <Link
          href="/import"
          className="inline-flex min-h-11 items-center justify-center rounded bg-black px-4 py-2 font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          + Add Song
        </Link>
      </div>

      <div className="flex flex-col gap-8 mt-4">
        
        {/* User Saved Songs */}
        {loaded && savedSongs.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
              Your Songs
            </h2>
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {savedSongs.map((song) => (
                <li key={song.id} className="group flex items-stretch hover:bg-neutral-50 dark:hover:bg-neutral-900">
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

        {/* Built-in Presets */}
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
    </main>
  );
}
