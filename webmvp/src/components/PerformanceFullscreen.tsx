"use client";

import Link from "next/link";

import { ChartZoomButtons } from "@/components/ChartZoomButtons";

type PerformanceFullscreenProps = {
  onExit: () => void;
  nextHref?: string | null;
  sessionPosition?: string | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  wakeLockSupported?: boolean;
};

export function PerformanceFullscreen({
  onExit,
  nextHref,
  sessionPosition,
  onZoomIn,
  onZoomOut,
  wakeLockSupported = true,
}: PerformanceFullscreenProps) {
  return (
    <>
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit fullscreen"
        className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-lf-border bg-lf-bg-sidebar/95 text-lg text-lf-text-primary shadow-sm backdrop-blur-md"
      >
        ✕
      </button>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto flex max-w-2xl items-center justify-between gap-2 px-3">
          <div className="min-w-0 text-xs text-lf-text-secondary">
            {sessionPosition ? (
              <span aria-live="polite">{sessionPosition}</span>
            ) : !wakeLockSupported ? (
              <span>Screen may dim — adjust Auto-Lock in device settings</span>
            ) : (
              <span className="sr-only">Performance fullscreen</span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-full border border-lf-border bg-lf-bg-sidebar/95 px-1 py-1 backdrop-blur-md">
            <ChartZoomButtons variant="bar" onZoomOut={onZoomOut} onZoomIn={onZoomIn} />
            {nextHref ? (
              <Link
                href={nextHref}
                aria-label="Next song"
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-lg text-lf-text-primary transition-colors hover:bg-lf-bg-muted"
              >
                ▶
              </Link>
            ) : (
              <span
                aria-hidden
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-lg opacity-30"
              >
                ▶
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
