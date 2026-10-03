"use client";

type PlacementToolbarProps = {
  chordCount: number;
  chordedLines: number;
  lineCount: number;
  canUndo: boolean;
  onUndo: () => void;
  /** Chord armed for one-click repeat placement, if any. */
  quickChord: string | null;
  lastChord: string | null;
  onToggleQuickChord: () => void;
};

export function PlacementToolbar({
  chordCount,
  chordedLines,
  lineCount,
  canUndo,
  onUndo,
  quickChord,
  lastChord,
  onToggleQuickChord,
}: PlacementToolbarProps) {
  const armable = quickChord ?? lastChord;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="min-h-10 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-3 text-sm font-medium text-lf-text-primary transition-colors hover:bg-lf-bg-muted disabled:opacity-40 disabled:hover:bg-lf-bg-elevated"
      >
        Undo
      </button>

      {armable ? (
        <button
          type="button"
          onClick={onToggleQuickChord}
          aria-pressed={quickChord !== null}
          className={`min-h-10 rounded-[var(--lf-radius-md)] border px-3 text-sm font-medium transition-colors ${
            quickChord
              ? "border-lf-brand bg-lf-bg-active text-lf-brand"
              : "border-lf-border bg-lf-bg-elevated text-lf-text-secondary hover:bg-lf-bg-muted"
          }`}
        >
          Quick place: <span className="font-semibold">{armable}</span>
          {quickChord ? " · on" : ""}
        </button>
      ) : null}

      <p className="ml-auto text-sm tabular-nums text-lf-text-secondary">
        {chordCount} chords · {chordedLines}/{lineCount} lines chorded
      </p>
    </div>
  );
}
