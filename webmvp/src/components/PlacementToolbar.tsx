"use client";

type PlacementToolbarProps = {
  chordCount: number;
  chordedLines: number;
  lineCount: number;
  canUndo: boolean;
  onUndo: () => void;
  /** Chord armed for one-click repeat placement, if any. */
  quickChord: string | null;
  /** Opens the chord picker (setup or change chord). */
  onQuickPlacePickChord: () => void;
  /** Disarms quick place without opening the picker. */
  onQuickPlaceTurnOff: () => void;
};

export function PlacementToolbar({
  chordCount,
  chordedLines,
  lineCount,
  canUndo,
  onUndo,
  quickChord,
  onQuickPlacePickChord,
  onQuickPlaceTurnOff,
}: PlacementToolbarProps) {
  const armed = quickChord !== null;

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

      <div
        className={`flex overflow-hidden rounded-[var(--lf-radius-md)] border ${
          armed ? "border-lf-brand" : "border-lf-border"
        }`}
      >
        {armed ? (
          <button
            type="button"
            onClick={onQuickPlaceTurnOff}
            className="min-h-10 border-r border-lf-brand/30 bg-lf-bg-active px-3 text-sm font-medium text-lf-brand hover:bg-lf-bg-muted"
            aria-label="Turn off quick place"
            title="Turn off quick place"
          >
            Off
          </button>
        ) : null}
        <button
          type="button"
          onClick={onQuickPlacePickChord}
          aria-pressed={armed}
          className={`min-h-10 px-3 text-sm font-medium transition-colors ${
            armed
              ? "bg-lf-bg-active text-lf-brand hover:bg-lf-bg-muted"
              : "bg-lf-bg-elevated text-lf-text-secondary hover:bg-lf-bg-muted"
          }`}
        >
          {armed ? (
            <>
              Quick place: <span className="font-semibold">{quickChord}</span>
              <span className="text-lf-text-tertiary"> · change</span>
            </>
          ) : (
            "Quick place"
          )}
        </button>
      </div>

      <p className="ml-auto text-sm tabular-nums text-lf-text-secondary">
        {chordCount} chords · {chordedLines}/{lineCount} lines chorded
      </p>
    </div>
  );
}
