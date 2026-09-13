"use client";

import Link from "next/link";

import type { Key } from "@/lib/engine";
import type { ChartTheme } from "@/lib/performancePreferences";

type PerformanceBottomBarProps = {
  targetKey: Key;
  originalKey: Key;
  onTransposeDown: () => void;
  onTransposeUp: () => void;
  onOpenKeyModal: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  scalePercent: number;
  chartTheme: ChartTheme;
  onToggleTheme: () => void;
  transposeFlash?: Key | null;
  sessionLabel?: string | null;
  sessionPosition?: string | null;
  prevHref?: string | null;
  nextHref?: string | null;
  sessionBackHref?: string | null;
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
      className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-sm font-semibold text-lf-text-primary transition-colors hover:bg-lf-bg-muted disabled:opacity-30"
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
  originalKey,
  onTransposeDown,
  onTransposeUp,
  onOpenKeyModal,
  onZoomOut,
  onZoomIn,
  scalePercent,
  chartTheme,
  onToggleTheme,
  transposeFlash,
  sessionLabel,
  sessionPosition,
  prevHref,
  nextHref,
  sessionBackHref,
}: PerformanceBottomBarProps) {
  const displayKey = transposeFlash ?? targetKey;
  const transposed = displayKey !== originalKey;

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
          <div className="flex items-center">
            <NavLink href={prevHref ?? "#"} label="Previous song" disabled={!prevHref}>
              ◀
            </NavLink>
            <NavLink href={nextHref ?? "#"} label="Next song" disabled={!nextHref}>
              ▶
            </NavLink>
          </div>

          <div className="flex items-center gap-0.5">
            <IconButton label="Transpose down" onClick={onTransposeDown}>
              −
            </IconButton>
            <button
              type="button"
              onClick={onOpenKeyModal}
              className="inline-flex min-h-11 min-w-[3.75rem] flex-col items-center justify-center rounded-[var(--lf-radius-md)] bg-lf-bg-active px-2 text-center"
              aria-label={`Key ${displayKey}. Tap to choose key.`}
              aria-live="polite"
            >
              <span className="text-base font-bold leading-none text-lf-brand">
                {displayKey}
              </span>
              {transposed && (
                <span className="text-[10px] leading-none text-lf-text-secondary">
                  from {originalKey}
                </span>
              )}
            </button>
            <IconButton label="Transpose up" onClick={onTransposeUp}>
              +
            </IconButton>
          </div>

          <div className="flex items-center gap-0.5">
            <IconButton label="Text smaller" onClick={onZoomOut}>
              A−
            </IconButton>
            <span className="inline-flex h-11 min-w-10 items-center justify-center text-xs tabular-nums text-lf-text-secondary">
              {scalePercent}%
            </span>
            <IconButton label="Text larger" onClick={onZoomIn}>
              A+
            </IconButton>
            <IconButton
              label={`Theme: ${THEME_LABELS[chartTheme]}`}
              onClick={onToggleTheme}
            >
              ◐
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}
