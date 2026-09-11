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

  const sorted = [...chords].sort((a, b) => a.position - b.position);

  return (
    <div className="chord-row relative min-h-[1.3em]">
      {sorted.map((mark) => (
        <span
          key={mark.position}
          className={
            onChordClick
              ? "absolute bottom-0 cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              : "absolute bottom-0"
          }
          style={{ left: `${mark.position}ch` }}
          onClick={onChordClick ? () => onChordClick(mark) : undefined}
        >
          {displayChord(mark, originalKey, targetKey, viewMode)}
        </span>
      ))}
    </div>
  );
}
