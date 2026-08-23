"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getSongs } from "@/lib/storage";
import type { Song } from "@/lib/types";

const importButtonClassName =
  "inline-flex min-h-11 w-full items-center justify-center rounded bg-neutral-900 px-4 py-2 text-base font-medium text-white hover:bg-neutral-800 sm:w-auto sm:text-sm dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white";

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSongs(getSongs());
    setLoaded(true);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            LF ChordApp
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Saved songs
          </p>
        </div>
        <Link href="/import" className={importButtonClassName}>
          Import Song
        </Link>
      </div>

      {!loaded ? (
        <p className="text-neutral-500">Loading songs…</p>
      ) : songs.length === 0 ? (
        <div className="flex flex-col items-stretch gap-4 rounded border border-dashed border-neutral-300 p-4 sm:items-start sm:p-8 dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-400">No songs yet</p>
          <Link href="/import" className={importButtonClassName}>
            Import Song
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {songs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/song/${song.id}`}
                className="flex min-h-14 items-center justify-between gap-3 px-4 py-4 hover:bg-neutral-50 active:bg-neutral-100 dark:hover:bg-neutral-900 dark:active:bg-neutral-800"
              >
                <span className="min-w-0 flex-1 break-words text-lg font-medium">
                  {song.title}
                </span>
                <span className="shrink-0 text-sm text-neutral-500 dark:text-neutral-400">
                  {song.originalKey}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
