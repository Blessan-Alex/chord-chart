import { getMarkStart, markKey, normalizeChordMark } from "@/lib/chordMarks";
import { chordToDegree, transposeChord } from "@/lib/engine";
import type { ChordMark } from "@/lib/types";

type ChordRowProps = {
  chords: ChordMark[];
  originalKey: string;
  targetKey: string;
  viewMode: "chords" | "numbers";
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

export function ChordRow({
  chords,
  originalKey,
  targetKey,
  viewMode,
  onChordClick,
}: ChordRowProps) {
  if (chords.length === 0) {
    return null;
  }

  const sorted = [...chords]
    .map(normalizeChordMark)
    .sort((a, b) => getMarkStart(a) - getMarkStart(b));

  return (
    <div className="chord-row relative min-h-[1.3em]">
      {sorted.map((mark) => (
        <span
          key={markKey(mark)}
          className={
            onChordClick
              ? "absolute bottom-0 cursor-pointer text-lf-brand hover:opacity-80"
              : "absolute bottom-0 text-lf-brand"
          }
          style={{ left: `${getMarkStart(mark)}ch` }}
          onClick={onChordClick ? () => onChordClick(mark) : undefined}
        >
          {displayChord(mark, originalKey, targetKey, viewMode)}
        </span>
      ))}
    </div>
  );
}
