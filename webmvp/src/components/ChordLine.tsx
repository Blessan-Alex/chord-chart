import { ChordRow } from "@/components/ChordRow";
import type { LyricLine } from "@/lib/types";

type ChordLineProps = {
  line: LyricLine;
  originalKey: string;
  targetKey: string;
  viewMode: "chords" | "numbers";
};

export function ChordLine({
  line,
  originalKey,
  targetKey,
  viewMode,
}: ChordLineProps) {
  const hasChords = line.chords.length > 0;
  const hasLyrics = line.lyrics.trim().length > 0;

  return (
    <div className="chord-line">
      {hasChords && (
        <ChordRow
          chords={line.chords}
          originalKey={originalKey}
          targetKey={targetKey}
          viewMode={viewMode}
        />
      )}
      {hasLyrics && <div className="lyric-row">{line.lyrics}</div>}
    </div>
  );
}
