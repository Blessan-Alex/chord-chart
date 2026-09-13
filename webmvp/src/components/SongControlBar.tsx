"use client";

import type { Key } from "@/lib/engine";

import type { SongViewMode } from "@/components/SongToolbar";

type SongControlBarProps = {
  targetKey: Key;
  originalKey: Key;
  viewMode: SongViewMode;
  scalePercent: number;
  transposeFlash?: Key | null;
  showMobileControls: boolean;
  onTransposeDown: () => void;
  onTransposeUp: () => void;
  onOpenKeyModal: () => void;
  onViewModeChange: (mode: SongViewMode) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onToggleAutoscroll: () => void;
  autoscrollActive?: boolean;
};

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 px-4 text-sm font-medium transition-colors ${
        active
          ? "bg-lf-action-primary text-lf-text-inverse"
          : "text-lf-text-secondary hover:text-lf-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

export function SongControlBar({
  targetKey,
  originalKey,
  viewMode,
  scalePercent,
  transposeFlash,
  showMobileControls,
  onTransposeDown,
  onTransposeUp,
  onOpenKeyModal,
  onViewModeChange,
  onZoomOut,
  onZoomIn,
  onToggleAutoscroll,
  autoscrollActive = false,
}: SongControlBarProps) {
  const displayKey = transposeFlash ?? targetKey;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!showMobileControls && (
          <div className="flex items-center gap-1 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated p-1">
            <button
              type="button"
              aria-label="Transpose down"
              onClick={onTransposeDown}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--lf-radius-sm)] text-lg font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
            >
              −
            </button>
            <button
              type="button"
              onClick={onOpenKeyModal}
              className="inline-flex min-h-10 min-w-14 flex-col items-center justify-center rounded-[var(--lf-radius-sm)] bg-lf-bg-active px-3 text-sm font-semibold text-lf-brand"
              aria-label={`Key ${displayKey}`}
            >
              {displayKey}
            </button>
            <button
              type="button"
              aria-label="Transpose up"
              onClick={onTransposeUp}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--lf-radius-sm)] text-lg font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
            >
              +
            </button>
          </div>
        )}

        <div className="flex overflow-hidden rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated">
          <SegmentButton
            active={viewMode === "chords"}
            onClick={() => onViewModeChange("chords")}
          >
            Chords
          </SegmentButton>
          <SegmentButton
            active={viewMode === "numbers"}
            onClick={() => onViewModeChange("numbers")}
          >
            Numbers
          </SegmentButton>
        </div>

        {!showMobileControls && (
          <div className="flex items-center gap-1 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated p-1">
            <button
              type="button"
              aria-label="Text smaller"
              onClick={onZoomOut}
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--lf-radius-sm)] text-sm font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
            >
              A−
            </button>
            <span className="inline-flex h-10 min-w-10 items-center justify-center text-xs tabular-nums text-lf-text-secondary">
              {scalePercent}%
            </span>
            <button
              type="button"
              aria-label="Text larger"
              onClick={onZoomIn}
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--lf-radius-sm)] text-sm font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
            >
              A+
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleAutoscroll}
          className={`min-h-10 rounded-full px-4 text-sm font-semibold ${
            autoscrollActive
              ? "bg-lf-brand text-lf-text-inverse"
              : "border border-lf-border bg-lf-bg-elevated text-lf-text-primary hover:bg-lf-bg-muted"
          }`}
        >
          Auto
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-lf-text-tertiary">
          Original key
        </span>
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-lf-bg-active px-2 text-sm font-semibold text-lf-brand">
          {originalKey}
        </span>
      </div>
    </div>
  );
}
