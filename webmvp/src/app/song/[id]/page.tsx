"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

import { ChordLine } from "@/components/ChordLine";
import { getPresetById } from "@/data/presets";
import { ALL_KEYS, type Key } from "@/lib/engine";
import { getSong } from "@/lib/storage";
import type { Song } from "@/lib/types";

function isKey(k: string): k is Key {
  return (ALL_KEYS as readonly string[]).includes(k);
}

export default function SongPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  
  const [song, setSong] = useState<Song | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [targetKey, setTargetKey] = useState<string>("C");
  const [viewMode, setViewMode] = useState<"chords" | "numbers">("chords");

  useEffect(() => {
    let found: Song | undefined = undefined;
    
    // 1. Check if it's a preset
    const preset = getPresetById(id);
    if (preset) {
      found = {
        id: preset.presetId,
        title: preset.title,
        originalKey: preset.originalKey,
        sections: preset.sections,
      };
    } else {
      // 2. If not a preset, check local storage for user-saved songs
      found = getSong(id);
    }
    
    setSong(found ?? null);
    if (found && isKey(found.originalKey)) {
      setTargetKey(found.originalKey);
    }
    setLoaded(true);
  }, [id]);

  if (!loaded) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-4">
        <p className="text-neutral-400">Loading…</p>
      </main>
    );
  }

  if (!song) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4 sm:p-8">
        <h1 className="text-2xl font-semibold">Song not found</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          No song matches this link.
        </p>
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          ← Home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col p-4 sm:p-8">
      <Link
        href="/"
        className="mb-2 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        ← Home
      </Link>

      {/* Sticky header */}
      <header className="sticky top-0 z-10 -mx-4 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8 dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold sm:text-xl">
              {song.title}
            </h1>
            <p className="text-xs text-neutral-500">
              Key: {song.originalKey}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle: Chords / Numbers */}
            <div className="flex overflow-hidden rounded-lg border border-neutral-300 text-xs dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setViewMode("chords")}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  viewMode === "chords"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                }`}
              >
                Chords
              </button>
              <button
                type="button"
                onClick={() => setViewMode("numbers")}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  viewMode === "numbers"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                }`}
              >
                Numbers
              </button>
            </div>

            {/* Key selector */}
            <select
              value={targetKey}
              onChange={(e) =>
                isKey(e.target.value) && setTargetKey(e.target.value)
              }
              className="min-h-9 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm font-semibold dark:border-neutral-700 dark:bg-neutral-950"
            >
              {ALL_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Song content */}
      <div className="chord-chart mt-4 pb-8">
        {song.sections.map((section, si) => (
          <div key={`${section.label}-${si}`}>
            <div className="section-label">[{section.label}]</div>
            {section.lines.map((line, li) => (
              <ChordLine
                key={`${si}-${li}`}
                line={line}
                originalKey={song.originalKey}
                targetKey={targetKey}
                viewMode={viewMode}
              />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
