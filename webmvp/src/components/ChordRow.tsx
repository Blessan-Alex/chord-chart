"use client";

import { useMemo, useRef, type CSSProperties } from "react";

import { getMarkStart, markKey, normalizeChordMark } from "@/lib/chordMarks";
import { chordToDegree, transposeChord } from "@/lib/engine";
import { useChordRowLayout } from "@/lib/hooks/useChordRowLayout";
import type { ChordLayoutPlacement } from "@/lib/chordLayout";
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

const TIER_STEP_EM = 1.35;

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
  resolved?: ChordLayoutPlacement,
): CSSProperties {
  if (resolved) {
    return {
      left: `${resolved.left}px`,
      bottom: resolved.tier > 0 ? `${resolved.tier * TIER_STEP_EM}em` : 0,
    };
  }

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
  const chordRowRef = useRef<HTMLDivElement>(null);
  const sorted = useMemo(() => {
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

    return [...merged].sort((a, b) => getMarkStart(a) - getMarkStart(b));
  }, [chords, previewMark]);

  const chordStarts = useMemo(
    () => sorted.map((mark) => getMarkStart(mark)),
    [sorted],
  );

  const displayLabels = useMemo(
    () =>
      sorted.map((mark) =>
        displayChord(mark, originalKey, targetKey, viewMode),
      ),
    [sorted, originalKey, targetKey, viewMode],
  );

  const usePixelLayout = Boolean(
    chordOffsets && Object.keys(chordOffsets).length > 0,
  );

  const { placements, tierCount } = useChordRowLayout(
    chordRowRef,
    chordStarts,
    displayLabels,
    usePixelLayout ? chordOffsets : undefined,
  );

  const rowMinHeight =
    usePixelLayout && tierCount > 1
      ? `${TIER_STEP_EM * tierCount}em`
      : undefined;

  const previewStart =
    previewMark?.chord.trim()
      ? getMarkStart(normalizeChordMark(previewMark))
      : null;

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div
      ref={chordRowRef}
      className="chord-row relative min-h-[1.3em]"
      style={rowMinHeight ? { minHeight: rowMinHeight } : undefined}
    >
      {sorted.map((mark, index) => {
        const start = getMarkStart(mark);
        const isPreview =
          previewStart !== null && start === previewStart;
        const resolved = usePixelLayout ? placements[index] : undefined;

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
            style={chordPositionStyle(start, chordOffsets, resolved)}
            onClick={onChordClick ? () => onChordClick(mark) : undefined}
          >
            {displayLabels[index]}
          </span>
        );
      })}
    </div>
  );
}
