"use client";

import { useState } from "react";

import { KeyPicker } from "@/components/KeyPicker";
import type { Song } from "@/lib/types";

type PerformanceHeaderProps = {
  song: Song;
  targetKey: string;
  onKeyChange: (key: string) => void;
  showChordLetters: boolean;
  onShowChordLettersChange: (show: boolean) => void;
};

export function PerformanceHeader({
  song,
  targetKey,
  onKeyChange,
  showChordLetters,
  onShowChordLettersChange,
}: PerformanceHeaderProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 -mx-4 border-b border-neutral-700 bg-[#0a0a0a]/95 px-4 py-2 backdrop-blur-sm sm:-mx-8 sm:px-8">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <KeyPicker
            variant="performance"
            value={targetKey}
            onChange={onKeyChange}
          />
        </div>
        <button
          type="button"
          onClick={() => setOptionsOpen((open) => !open)}
          aria-expanded={optionsOpen}
          aria-label="Chart options"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-600 text-xl text-neutral-300 hover:bg-neutral-900"
        >
          ⋯
        </button>
      </div>

      {optionsOpen ? (
        <div className="mt-2 space-y-2 border-t border-neutral-800 pt-2">
          <p className="truncate text-sm text-neutral-400">{song.title}</p>
          <p className="text-xs text-neutral-500">Original key: {song.originalKey}</p>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-neutral-400">
            <input
              type="checkbox"
              checked={showChordLetters}
              onChange={(event) =>
                onShowChordLettersChange(event.target.checked)
              }
              className="h-4 w-4 rounded border-neutral-600"
            />
            Show chord letters
          </label>
        </div>
      ) : null}
    </header>
  );
}
