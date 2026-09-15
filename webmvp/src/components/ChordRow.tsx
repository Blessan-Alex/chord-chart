import type { CSSProperties } from "react";

import { getMarkStart, markKey, normalizeChordMark } from "@/lib/chordMarks";
import { chordToDegree, transposeChord } from "@/lib/engine";
import type { ChordMark } from "@/lib/types";

type ChordRowProps = {
  chords: ChordMark[];
  originalKey: string;
  targetKey: string;
  viewMode: "chords" | "numbers";
  chordOffsets?: Record<number, number>;
  previewMark?: ChordMark | null;
  onChordClick?: (mark: ChordMark) => void;
};

function safeTranspose(chord: string, from: string, to: string): string {
  try {
    return transposeChord(chord, from, to);
  } catch {
    return chord;
  }
}

function safeDegree(chord: string, key: string): string {
  try {
    return chordToDegree(chord, key);
  } catch {
    return "?";
  }
}

function displayChord(
  mark: ChordMark,
  originalKey: string,
  targetKey: string,
  viewMode: "chords" | "numbers",
): string {
  return viewMode === "chords"
    ? safeTranspose(mark.chord, originalKey, targetKey)
    : safeDegree(mark.chord, originalKey);
}

function chordPositionStyle(
  start: number,
  chordOffsets?: Record<number, number>,
): CSSProperties {
  const measured = chordOffsets?.[start];
  if (measured !== undefined) {
    return { left: `${measured}px` };
  }

  return { left: `${start}ch` };
}

export function ChordRow({
  chords,
  originalKey,
  targetKey,
  viewMode,
  chordOffsets,
  previewMark,
  onChordClick,
}: ChordRowProps) {
  const normalized = chords.map(normalizeChordMark);
  const preview =
    previewMark?.chord.trim() ?
      normalizeChordMark(previewMark)
    : null;

  const merged = preview
    ? [
        ...normalized.filter(
          (mark) => getMarkStart(mark) !== getMarkStart(preview),
        ),
        preview,
      ]
    : normalized;

  if (merged.length === 0) {
    return null;
  }

  const sorted = [...merged].sort((a, b) => getMarkStart(a) - getMarkStart(b));

  return (
    <div className="chord-row relative min-h-[1.3em]">
      {sorted.map((mark) => {
        const start = getMarkStart(mark);
        const isPreview = preview !== null && start === getMarkStart(preview);

        return (
          <span
            key={isPreview ? `preview-${markKey(mark)}` : markKey(mark)}
            className={
              onChordClick
                ? `absolute bottom-0 cursor-pointer hover:opacity-80 ${
                    isPreview ? "text-lf-brand/70" : "text-lf-brand"
                  }`
                : `absolute bottom-0 ${isPreview ? "text-lf-brand/70" : "text-lf-brand"}`
            }
            style={chordPositionStyle(start, chordOffsets)}
            onClick={onChordClick ? () => onChordClick(mark) : undefined}
          >
            {displayChord(mark, originalKey, targetKey, viewMode)}
          </span>
        );
      })}
    </div>
  );
}
