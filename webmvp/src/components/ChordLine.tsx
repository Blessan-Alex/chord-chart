"use client";

import { useMemo, useRef } from "react";

import { ChordRow } from "@/components/ChordRow";
import {
  EMPTY_CHORD_INDICES,
  useLyricChordOffsets,
} from "@/lib/hooks/useLyricChordOffsets";
import { lyricChordStarts, lyricChordsSignature } from "@/lib/lyricChords";
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

function MeasuredSegment({
  segment,
  originalKey,
  targetKey,
  viewMode,
}: {
  segment: { lyrics: string; chords: LyricLine["chords"] };
  originalKey: string;
  targetKey: string;
  viewMode: "chords" | "numbers";
}) {
  const lyricRef = useRef<HTMLDivElement>(null);
  const chordsSignature = lyricChordsSignature(segment.chords);
  const chordStarts = useMemo(
    () => lyricChordStarts(segment.chords),
    [chordsSignature],
  );
  const chordOffsets = useLyricChordOffsets(
    lyricRef,
    segment.lyrics,
    chordStarts,
    EMPTY_CHORD_INDICES,
  );

  const hasChords = segment.chords.length > 0;
  const hasLyrics = segment.lyrics.trim().length > 0;

  return (
    <>
      {hasChords && (
        <ChordRow
          chords={segment.chords}
          originalKey={originalKey}
          targetKey={targetKey}
          viewMode={viewMode}
          chordOffsets={chordOffsets}
        />
      )}
      {hasLyrics && (
        <div ref={lyricRef} className="lyric-row lyric-line-measured">
          {segment.lyrics}
        </div>
      )}
    </>
  );
}

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
      {segments.map((segment, index) => (
          <div
            className="chord-line"
            key={`${index}-${segment.lyrics.slice(0, 12)}`}
            aria-label={
              segment.lyrics.trim()
                ? `${segment.chords.map((c) => c.chord).join(", ")} — ${segment.lyrics}`
                : undefined
            }
          >
            <MeasuredSegment
              segment={segment}
              originalKey={originalKey}
              targetKey={targetKey}
              viewMode={viewMode}
            />
          </div>
        ))}
    </>
  );
}
