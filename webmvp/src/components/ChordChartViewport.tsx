"use client";

import type { ReactNode } from "react";

type ChordChartViewportProps = {
  children: ReactNode;
  scale: number;
  scalePercent: number;
  showIndicator: boolean;
  pinchHandlers: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  };
  className?: string;
};

export function ChordChartViewport({
  children,
  scale,
  scalePercent,
  showIndicator,
  pinchHandlers,
  className = "",
}: ChordChartViewportProps) {
  return (
    <div
      className={`chord-chart-viewport relative ${className}`}
      style={{ touchAction: "pan-y" }}
      {...pinchHandlers}
    >
      {showIndicator && (
        <div
          className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-neutral-900/85 px-3 py-1 text-xs font-semibold text-white shadow-lg dark:bg-neutral-100/90 dark:text-neutral-900"
          aria-live="polite"
        >
          {scalePercent}%
        </div>
      )}
      <div
        className="chord-chart-scaler origin-top"
        style={{ transform: `scale(${scale})`, willChange: "transform" }}
      >
        {children}
      </div>
    </div>
  );
}
