import { MAJOR_KEYS, transposeSlot } from "@/lib/engine";
import { getSlotLabels } from "@/lib/lineLabels";
import type { ChordSlot, Line } from "@/lib/types";

type SongLineProps = {
  line: Line;
  targetKey: string;
  showChordLetters: boolean;
};

function isValidTargetKey(key: string): key is (typeof MAJOR_KEYS)[number] {
  return typeof key === "string" && (MAJOR_KEYS as readonly string[]).includes(key);
}

function getTransposedChord(
  slot: ChordSlot,
  targetKey: string,
  showChordLetters: boolean,
): string {
  if (!showChordLetters || !isValidTargetKey(targetKey)) {
    return "";
  }

  try {
    return transposeSlot(slot, targetKey).chord;
  } catch {
    return "?";
  }
}

export function SongLine({
  line,
  targetKey,
  showChordLetters,
}: SongLineProps) {
  const labels = getSlotLabels(line);

  return (
    <section className="chart-line">
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {line.slots.map((slot, index) => {
          const chord = getTransposedChord(slot, targetKey, showChordLetters);

          return (
            <div
              key={`${line.lyrics}-${index}`}
              className="flex flex-col items-center text-center"
            >
              {showChordLetters ? (
                <span className="chart-chord font-mono text-xs font-medium sm:text-sm">
                  {chord || "—"}
                </span>
              ) : null}
              <span className="chart-degree font-mono text-2xl font-bold tabular-nums sm:text-3xl">
                {slot.degree || "—"}
              </span>
              <span className="chart-label mt-1 text-sm leading-tight sm:text-base">
                {labels[index] ?? ""}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
