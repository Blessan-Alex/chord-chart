"use client";

import { useEffect, useRef } from "react";

type ChordInputPopoverProps = {
  open: boolean;
  value: string;
  error: string | null;
  palette: string[];
  mobile?: boolean;
  onChange: (value: string) => void;
  onSubmit: (value?: string) => void;
  onRemove: () => void;
  onCancel: () => void;
};

export function ChordInputPopover({
  open,
  value,
  error,
  palette,
  mobile = false,
  onChange,
  onSubmit,
  onRemove,
  onCancel,
}: ChordInputPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  const panelClass = mobile
    ? "fixed inset-x-0 bottom-0 z-50 rounded-t-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
    : "fixed bottom-8 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4 shadow-xl";

  return (
    <>
      {!mobile && (
        <button
          type="button"
          aria-label="Close chord input"
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onCancel}
        />
      )}
      <div className={panelClass}>
        <h3 className="text-base font-semibold text-lf-text-primary">
          Place chord
        </h3>
        <p className="mt-1 text-sm text-lf-text-secondary">
          Press Enter to place above the start of your selection.
        </p>

        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="e.g. Am7"
            className="w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-4 py-3 text-lg font-semibold text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
          />
          {error && (
            <p className="mt-2 text-sm text-lf-danger" role="alert">
              {error}
            </p>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2">
            {palette.map((chord) => (
              <button
                key={chord}
                type="button"
                onClick={() => onSubmit(chord)}
                className="rounded-[var(--lf-radius-md)] bg-lf-bg-muted py-2 font-semibold text-lf-text-primary hover:bg-lf-bg-active"
              >
                {chord}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onRemove}
              className="text-sm font-medium text-lf-danger hover:underline"
            >
              Remove
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-[var(--lf-radius-md)] px-4 py-2 text-sm font-medium text-lf-text-secondary hover:bg-lf-bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 py-2 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
              >
                Place chord
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
