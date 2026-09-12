"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

type ChordChartViewportProps = {
  children: ReactNode;
  scale: number;
  scalePercent: number;
  showIndicator: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  onPinchScale: (scale: number) => void;
  onPinchEnd: () => void;
  onDoubleTap: () => void;
  className?: string;
};

function touchDistance(touches: TouchList): number {
  if (touches.length < 2) {
    return 0;
  }
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
}

export function ChordChartViewport({
  children,
  scale,
  scalePercent,
  showIndicator,
  containerRef,
  onPinchScale,
  onPinchEnd,
  onDoubleTap,
  className = "",
}: ChordChartViewportProps) {
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null);
  const scaleRef = useRef(scale);
  const lastTapRef = useRef(0);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchStartRef.current = {
          distance: touchDistance(event.touches),
          scale: scaleRef.current,
        };
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchStartRef.current) {
        return;
      }
      event.preventDefault();
      const distance = touchDistance(event.touches);
      if (distance <= 0 || pinchStartRef.current.distance <= 0) {
        return;
      }
      const ratio = distance / pinchStartRef.current.distance;
      onPinchScale(pinchStartRef.current.scale * ratio);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2 && pinchStartRef.current) {
        pinchStartRef.current = null;
        onPinchEnd();
      }

      if (event.touches.length === 0 && event.changedTouches.length === 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 280) {
          onDoubleTap();
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [containerRef, onDoubleTap, onPinchEnd, onPinchScale]);

  return (
    <div
      ref={containerRef}
      className={`chord-chart-viewport relative w-full max-w-full ${className}`}
      style={{
        touchAction: "pan-y",
        ["--chart-scale" as string]: scale,
      }}
    >
      {showIndicator && (
        <div
          className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-neutral-900/85 px-3 py-1 text-xs font-semibold text-white shadow-lg dark:bg-neutral-100/90 dark:text-neutral-900"
          aria-live="polite"
        >
          {scalePercent}%
        </div>
      )}
      <div className="chord-chart-scaler w-full max-w-full">{children}</div>
    </div>
  );
}
