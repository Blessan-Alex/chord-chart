"use client";

import Link from "next/link";

import { AutoscrollToggleButton } from "@/components/AutoscrollToggleButton";
import { ChartZoomButtons } from "@/components/ChartZoomButtons";
import { FullscreenToggleButton } from "@/components/FullscreenToggleButton";
import type { Key } from "@/lib/engine";
import type { ChartTheme } from "@/lib/performancePreferences";

type PerformanceBottomBarProps = {
  targetKey: Key;
  onTransposeDown: () => void;
  onTransposeUp: () => void;
  onOpenKeyModal: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  chartTheme: ChartTheme;
  onToggleTheme: () => void;
  transposeFlash?: Key | null;
  sessionLabel?: string | null;
  sessionPosition?: string | null;
  prevHref?: string | null;
  nextHref?: string | null;
  sessionBackHref?: string | null;
  autoscrollActive?: boolean;
  onToggleAutoscroll?: () => void;
  fullscreenActive?: boolean;
  onToggleFullscreen?: () => void;
};

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-lf-text-primary transition-colors hover:bg-lf-bg-muted disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function NavLink({
  href,
  label,
  children,
  disabled,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span
        aria-hidden
        className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-lg opacity-30"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-lg text-lf-text-primary transition-colors hover:bg-lf-bg-muted"
    >
      {children}
    </Link>
  );
}

const THEME_LABELS: Record<ChartTheme, string> = {
  system: "Auto",
  dark: "Dark",
  stage: "Stage",
};

export function PerformanceBottomBar({
  targetKey,
  onTransposeDown,
  onTransposeUp,
  onOpenKeyModal,
  onZoomOut,
  onZoomIn,
  chartTheme,
  onToggleTheme,
  transposeFlash,
  sessionLabel,
  sessionPosition,
  prevHref,
  nextHref,
  sessionBackHref,
  autoscrollActive = false,
  onToggleAutoscroll,
  fullscreenActive = false,
  onToggleFullscreen,
}: PerformanceBottomBarProps) {
  const displayKey = transposeFlash ?? targetKey;

  return (
    <div className="performance-bottom-bar fixed inset-x-0 bottom-0 z-30 border-t border-lf-border bg-lf-bg-sidebar/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl flex-col gap-1.5 px-2">
        {sessionLabel && (
          <div className="truncate px-1 text-[11px] text-lf-text-secondary">
            {sessionBackHref ? (
              <Link href={sessionBackHref} className="hover:text-lf-text-primary">
                {sessionLabel}
              </Link>
            ) : (
              sessionLabel
            )}
            {sessionPosition && (
              <span className="text-lf-text-tertiary"> · {sessionPosition}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          {(prevHref || nextHref) && (
            <div className="flex shrink-0 items-center">
              <NavLink href={prevHref ?? "#"} label="Previous song" disabled={!prevHref}>
                ◀
              </NavLink>
              <NavLink href={nextHref ?? "#"} label="Next song" disabled={!nextHref}>
                ▶
              </NavLink>
            </div>
          )}

          <div
            className={`flex shrink-0 items-center gap-0.5 ${!(prevHref || nextHref) ? "mx-auto" : ""}`}
          >
            <IconButton label="Transpose down" onClick={onTransposeDown}>
              −
            </IconButton>
            <button
              type="button"
              onClick={onOpenKeyModal}
              className="inline-flex min-h-11 min-w-16 shrink-0 items-center justify-center rounded-[var(--lf-radius-md)] bg-lf-bg-active px-3 text-center"
              aria-label={`Key ${displayKey}. Tap to choose key.`}
              aria-live="polite"
            >
              <span className="text-xl font-bold leading-none text-lf-brand">
                {displayKey}
              </span>
            </button>
            <IconButton label="Transpose up" onClick={onTransposeUp}>
              +
            </IconButton>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <ChartZoomButtons
              variant="bar"
              onZoomOut={onZoomOut}
              onZoomIn={onZoomIn}
            />
            <button
              type="button"
              aria-label={`Theme: ${THEME_LABELS[chartTheme]}`}
              onClick={onToggleTheme}
              className="inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full text-xl text-lf-text-primary transition-colors hover:bg-lf-bg-muted"
            >
              ◐
            </button>
            {onToggleAutoscroll && (
              <AutoscrollToggleButton
                variant="bar"
                active={autoscrollActive}
                onClick={onToggleAutoscroll}
              />
            )}
            {onToggleFullscreen && (
              <FullscreenToggleButton
                variant="bar"
                active={fullscreenActive}
                onClick={onToggleFullscreen}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
