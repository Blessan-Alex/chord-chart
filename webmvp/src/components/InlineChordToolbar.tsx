"use client";

type InlineChordToolbarProps = {
  palette: string[];
  value: string;
  targetText?: string | null;
  error: string | null;
  reserveSaveBarSpace?: boolean;
  onChange: (value: string) => void;
  onPick: (chord: string) => void;
  onSubmit: () => void;
  onRemove: () => void;
  onCancel: () => void;
};

export function InlineChordToolbar({
  palette,
  value,
  targetText,
  error,
  reserveSaveBarSpace = false,
  onChange,
  onPick,
  onSubmit,
  onRemove,
  onCancel,
}: InlineChordToolbarProps) {
  const bottomOffset = reserveSaveBarSpace
    ? "calc(4.5rem + env(safe-area-inset-bottom))"
    : "calc(0.5rem + env(safe-area-inset-bottom))";

  return (
    <div
      className="fixed inset-x-0 z-40 mx-auto max-w-2xl px-4"
      style={{ bottom: bottomOffset }}
    >
      <div className="rounded-[var(--lf-radius-lg)] border border-lf-brand/30 bg-lf-bg-elevated p-3 shadow-lg">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-lf-text-primary">
              Place chord{value ? `: ${value}` : ""}
            </p>
            {targetText ? (
              <p className="truncate text-xs text-lf-text-secondary">
                Placing on {targetText}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-9 px-2 text-sm text-lf-text-secondary hover:text-lf-text-primary"
          >
            Cancel
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {palette.map((chord) => (
            <button
              key={chord}
              type="button"
              onClick={() => onPick(chord)}
              className="min-h-11 shrink-0 rounded-[var(--lf-radius-md)] bg-lf-bg-muted px-4 text-sm font-semibold text-lf-text-primary hover:bg-lf-bg-active active:bg-lf-brand active:text-lf-text-inverse"
            >
              {chord}
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Custom: Am7, G/B…"
            className="min-h-11 min-w-0 flex-1 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-3 text-sm font-semibold text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
          />
          <button
            type="submit"
            className="min-h-11 shrink-0 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
          >
            Place
          </button>
        </form>

        {error && (
          <p className="mt-2 text-sm text-lf-danger" role="alert">
            {error}
          </p>
        )}

        {value && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-2 min-h-9 text-sm font-medium text-lf-danger hover:underline"
          >
            Remove chord
          </button>
        )}
      </div>
    </div>
  );
}
