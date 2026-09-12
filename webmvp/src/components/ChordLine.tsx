"use client";

import { useMemo } from "react";

import { ChordRow } from "@/components/ChordRow";
import { wrapLyricLine } from "@/lib/wrapLyricLine";
import type { LyricLine } from "@/lib/types";

type ChordLineProps = {
  line: LyricLine;
  originalKey: string;
  targetKey: string;
  viewMode: "chords" | "numbers";
  wrapEnabled?: boolean;
  maxChars?: number;
};

export function ChordLine({
  line,
  originalKey,
  targetKey,
  viewMode,
  wrapEnabled = false,
  maxChars = 32,
}: ChordLineProps) {
  const segments = useMemo(() => {
    if (!wrapEnabled) {
      return [
        {
          lyrics: line.lyrics,
          chords: line.chords,
        },
      ];
    }
    return wrapLyricLine(line, maxChars);
  }, [line, maxChars, wrapEnabled]);

  return (
    <>
      {segments.map((segment, index) => {
        const hasChords = segment.chords.length > 0;
        const hasLyrics = segment.lyrics.trim().length > 0;

        return (
          <div
            className="chord-line"
            key={`${index}-${segment.lyrics.slice(0, 12)}`}
            aria-label={
              hasLyrics
                ? `${segment.chords.map((c) => c.chord).join(", ")} — ${segment.lyrics}`
                : undefined
            }
          >
            {hasChords && (
              <ChordRow
                chords={segment.chords}
                originalKey={originalKey}
                targetKey={targetKey}
                viewMode={viewMode}
              />
            )}
            {hasLyrics && <div className="lyric-row">{segment.lyrics}</div>}
          </div>
        );
      })}
    </>
  );
}
