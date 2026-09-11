"use client";

import Link from "next/link";

import type { Key } from "@/lib/engine";
import type { ChartTheme } from "@/lib/performancePreferences";

type PerformanceBottomBarProps = {
  targetKey: Key;
  originalKey: Key;
  onTransposeDown: () => void;
  onTransposeUp: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  scalePercent: number;
  chartTheme: ChartTheme;
  onToggleTheme: () => void;
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
      className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-sm font-semibold text-neutral-200 transition-colors hover:bg-white/10 disabled:opacity-30"
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
      className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-lg text-neutral-100 transition-colors hover:bg-white/10"
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
  onZoomOut,
  onZoomIn,
  scalePercent,
  chartTheme,
  onToggleTheme,
  sessionLabel,
  sessionPosition,
  prevHref,
  nextHref,
  sessionBackHref,
}: PerformanceBottomBarProps) {
  const transposed = targetKey !== originalKey;

  return (
    <div className="performance-bottom-bar fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-neutral-950/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-3">
        {(sessionLabel || scalePercent !== 100) && (
          <div className="flex items-center justify-between gap-2 px-1 text-xs text-neutral-400">
            <div className="min-w-0 truncate">
              {sessionLabel ? (
                sessionBackHref ? (
                  <Link href={sessionBackHref} className="hover:text-neutral-200">
                    {sessionLabel}
                  </Link>
                ) : (
                  sessionLabel
                )
              ) : (
                <span>Chart zoom</span>
              )}
              {sessionPosition && (
                <span className="text-neutral-500"> · {sessionPosition}</span>
              )}
            </div>
            <span className="shrink-0 tabular-nums">{scalePercent}%</span>
          </div>
        )}

        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1">
          <div className="flex items-center gap-0.5">
            <NavLink href={prevHref ?? "#"} label="Previous song" disabled={!prevHref}>
              ◀
            </NavLink>
            <NavLink href={nextHref ?? "#"} label="Next song" disabled={!nextHref}>
              ▶
            </NavLink>
          </div>

          <div className="flex items-center justify-center gap-1">
            <IconButton label="Transpose down" onClick={onTransposeDown}>
              −
            </IconButton>
            <div
              className="inline-flex min-h-11 min-w-[4.5rem] flex-col items-center justify-center rounded-xl bg-white/10 px-2 text-center"
              aria-label={`Key ${targetKey}`}
            >
              <span className="text-base font-bold leading-none text-white">
                {targetKey}
              </span>
              {transposed && (
                <span className="text-[10px] leading-none text-neutral-400">
                  from {originalKey}
                </span>
              )}
            </div>
            <IconButton label="Transpose up" onClick={onTransposeUp}>
              +
            </IconButton>
          </div>

          <div className="flex items-center justify-end gap-0.5">
            <IconButton label="Zoom out" onClick={onZoomOut}>
              A−
            </IconButton>
            <IconButton label="Zoom in" onClick={onZoomIn}>
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
