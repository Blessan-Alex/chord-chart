"use client";

type ComposerActionBarProps = {
  onBack: () => void;
  backLabel?: string;
  canUndo?: boolean;
  onUndo?: () => void;
  saveLabel?: string;
  onSave?: () => void;
  saveDisabled?: boolean;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  busy?: boolean;
  saveStatus?: "idle" | "saving" | "saved";
};

export function ComposerActionBar({
  onBack,
  backLabel = "Back",
  canUndo = false,
  onUndo,
  saveLabel = "Save draft",
  onSave,
  saveDisabled = false,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  busy = false,
  saveStatus = "idle",
}: ComposerActionBarProps) {
  return (
    <div
      className="sticky bottom-0 z-30 -mx-4 border-t border-lf-border bg-lf-bg-elevated/95 px-4 py-3 backdrop-blur sm:bottom-auto sm:top-0 sm:mx-0 sm:mb-4 sm:rounded-[var(--lf-radius-lg)] sm:border sm:shadow-sm"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-[var(--lf-radius-md)] border border-lf-border px-4 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted"
        >
          {backLabel}
        </button>

        {onUndo ? (
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo || busy}
            className="min-h-11 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-4 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted disabled:opacity-40"
          >
            Undo
          </button>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {saveStatus === "saved" ? (
            <span className="text-xs text-lf-text-tertiary" role="status">
              Saved
            </span>
          ) : saveStatus === "saving" ? (
            <span className="text-xs text-lf-text-tertiary" role="status">
              Saving…
            </span>
          ) : null}

          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saveDisabled || busy}
              className="min-h-11 rounded-[var(--lf-radius-md)] border border-lf-border px-4 text-sm font-semibold text-lf-text-primary hover:bg-lf-bg-muted disabled:opacity-40"
            >
              {saveLabel}
            </button>
          ) : null}

          {onPrimary ? (
            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryDisabled || busy}
              className="min-h-11 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-5 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-40"
            >
              {primaryLabel ?? "Publish"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
