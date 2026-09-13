"use client";

type AutoscrollBarProps = {
  speed: number;
  paused: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onTogglePause: () => void;
  onClose: () => void;
};

export function AutoscrollBar({
  speed,
  paused,
  onDecrease,
  onIncrease,
  onTogglePause,
  onClose,
}: AutoscrollBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-lf-border bg-lf-bg-sidebar/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3">
        <button
          type="button"
          aria-label="Close autoscroll"
          onClick={onClose}
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-lf-text-secondary hover:bg-lf-bg-muted"
        >
          ✕
        </button>

        <div className="flex items-center gap-1 rounded-full border border-lf-border bg-lf-bg-elevated p-1">
          <button
            type="button"
            aria-label="Slower"
            onClick={onDecrease}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-full text-lg font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
          >
            −
          </button>
          <span className="inline-flex min-w-16 items-center justify-center text-sm font-semibold tabular-nums text-lf-brand">
            {speed.toFixed(1)}x
          </span>
          <button
            type="button"
            aria-label="Faster"
            onClick={onIncrease}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-full text-lg font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
          >
            +
          </button>
        </div>

        <button
          type="button"
          aria-label={paused ? "Resume autoscroll" : "Pause autoscroll"}
          onClick={onTogglePause}
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-lf-brand text-sm font-semibold text-lf-text-inverse hover:bg-lf-brand-hover"
        >
          {paused ? "▶" : "❚❚"}
        </button>
      </div>
    </div>
  );
}
