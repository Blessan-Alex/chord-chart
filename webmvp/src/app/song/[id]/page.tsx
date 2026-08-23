"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PerformanceHeader } from "@/components/PerformanceHeader";
import { SongLine } from "@/components/SongLine";
import { MAJOR_KEYS } from "@/lib/engine";
import { getSong } from "@/lib/storage";
import type { Song } from "@/lib/types";

function isMajorKey(key: string): key is (typeof MAJOR_KEYS)[number] {
  return (MAJOR_KEYS as readonly string[]).includes(key);
}

export default function SongPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [song, setSong] = useState<Song | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [targetKey, setTargetKey] = useState("C");
  const [showChordLetters, setShowChordLetters] = useState(false);

  const handleKeyChange = useCallback((key: string) => {
    if (typeof key === "string" && isMajorKey(key)) {
      setTargetKey(key);
    }
  }, []);

  const handleShowChordLettersChange = useCallback((show: boolean) => {
    if (typeof show === "boolean") {
      setShowChordLetters(show);
    }
  }, []);

  useEffect(() => {
    const found = getSong(id);
    setSong(found ?? null);
    if (found && isMajorKey(found.originalKey)) {
      setTargetKey(found.originalKey);
    }
    setLoaded(true);
  }, [id]);

  if (!loaded) {
    return (
      <main className="performance-mode mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-4 sm:p-8">
        <p className="text-neutral-400">Loading song…</p>
      </main>
    );
  }

  if (!song) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4 sm:p-8">
        <h1 className="text-2xl font-semibold">Song not found</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          No saved song matches this link. Try importing again or return home.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          ← Home
        </Link>
      </main>
    );
  }

  return (
    <main className="performance-mode mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm text-neutral-500 hover:text-neutral-400"
      >
        ← Home
      </Link>

      <PerformanceHeader
        song={song}
        targetKey={targetKey}
        onKeyChange={handleKeyChange}
        showChordLetters={showChordLetters}
        onShowChordLettersChange={handleShowChordLettersChange}
      />

      <div className="flex flex-col gap-10 pt-2">
        {song.lines.map((line) => (
          <SongLine
            key={line.lyrics}
            line={line}
            targetKey={targetKey}
            showChordLetters={showChordLetters}
          />
        ))}
      </div>
    </main>
  );
}
