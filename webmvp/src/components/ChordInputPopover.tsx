"use client";

import { useEffect, useRef } from "react";

type ChordInputPopoverProps = {
  open: boolean;
  value: string;
  /** Plain-language description of the slot being placed on. */
  targetLabel?: string | null;
  error: string | null;
  palette: string[];
  /** Chords already used in this song. */
  recents?: string[];
  mobile?: boolean;
  canRemove?: boolean;
  onChange: (value: string) => void;
  onSubmit: (value?: string) => void;
  onSubmitNext: (value?: string) => void;
  onRemove: () => void;
  onCancel: () => void;
};

export function ChordInputPopover({
  open,
  value,
  targetLabel,
  error,
  palette,
  recents = [],
  mobile = false,
  canRemove = false,
  onChange,
  onSubmit,
  onSubmitNext,
  onRemove,
  onCancel,
}: ChordInputPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
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

  /** Desktop stays non-modal: clicking another lyric target retargets instead of closing. */
  useEffect(() => {
    if (!open || mobile) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (panelRef.current?.contains(target) || target.closest(".chord-chart-editor")) {
        return;
      }
      onCancel();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, mobile, onCancel]);

  if (!open) {
    return null;
  }

  const panelClass = mobile
    ? "fixed inset-x-0 bottom-0 z-50 rounded-t-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
    : "fixed bottom-6 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-[var(--lf-radius-lg)] border border-lf-brand/30 bg-lf-bg-elevated p-4 shadow-xl";

  const quickPicks = [...new Set([...recents, ...palette])];
  const heading = canRemove ? "Edit chord" : "Place chord";

  return (
    <>
      {mobile ? (
        <button
          type="button"
          aria-label="Close chord input"
          className="fixed inset-0 z-40 bg-black/25"
          onClick={onCancel}
        />
      ) : null}

      <div
        ref={panelRef}
        role="dialog"
        aria-label={heading}
        className={panelClass}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-lf-text-primary">
              {heading}
            </h3>
            <p
              className="mt-0.5 truncate text-sm text-lf-text-secondary"
              aria-live="polite"
            >
              {targetLabel ?? "Pick a chord or type one."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="-mr-1 -mt-1 min-h-9 shrink-0 px-2 text-lg leading-none text-lf-text-tertiary hover:text-lf-text-primary"
          >
            ×
          </button>
        </div>

        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            const nativeEvent = event.nativeEvent as SubmitEvent & {
              shiftKey?: boolean;
            };
            if (nativeEvent.shiftKey) {
              onSubmitNext();
              return;
            }
            onSubmit();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.shiftKey) {
                event.preventDefault();
                onSubmitNext();
              }
            }}
            placeholder="Am7"
            className="min-h-12 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-4 text-lg font-semibold text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
          />
          {error && (
            <p className="mt-2 text-sm text-lf-danger" role="alert">
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {quickPicks.map((chord) => (
              <button
                key={chord}
                type="button"
                onClick={() => onSubmit(chord)}
                className="min-h-11 min-w-14 rounded-[var(--lf-radius-md)] bg-lf-bg-muted px-3 text-base font-semibold text-lf-text-primary hover:bg-lf-bg-active active:bg-lf-bg-active"
              >
                {chord}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canRemove ? (
              <button
                type="button"
                onClick={onRemove}
                className="min-h-11 px-2 text-sm font-medium text-lf-danger hover:underline"
              >
                Remove
              </button>
            ) : null}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => onSubmitNext()}
                className="min-h-11 rounded-[var(--lf-radius-md)] border border-lf-border px-3 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted"
              >
                Place &amp; next
              </button>
              <button
                type="submit"
                className="min-h-11 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-5 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
              >
                Place
              </button>
            </div>
          </div>

          {!mobile ? (
            <p className="mt-3 text-xs text-lf-text-tertiary">
              <kbd className="rounded bg-lf-bg-muted px-1 py-0.5 font-mono">
                Enter
              </kbd>{" "}
              place ·{" "}
              <kbd className="rounded bg-lf-bg-muted px-1 py-0.5 font-mono">
                Shift+Enter
              </kbd>{" "}
              place &amp; next ·{" "}
              <kbd className="rounded bg-lf-bg-muted px-1 py-0.5 font-mono">
                Alt+Arrow
              </kbd>{" "}
              move target ·{" "}
              <kbd className="rounded bg-lf-bg-muted px-1 py-0.5 font-mono">Esc</kbd>{" "}
              close
            </p>
          ) : null}
        </form>
      </div>
    </>
  );
}
