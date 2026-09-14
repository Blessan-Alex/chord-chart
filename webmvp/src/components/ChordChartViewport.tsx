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
  /** When false, pinch and double-tap zoom are disabled (e.g. during autoscroll). */
  gesturesEnabled?: boolean;
};

const PINCH_ACTIVATION_PX = 14;
const DOUBLE_TAP_MOVE_PX = 28;

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
  gesturesEnabled = true,
}: ChordChartViewportProps) {
  const pinchStartRef = useRef<{
    distance: number;
    scale: number;
    armed: boolean;
  } | null>(null);
  const scaleRef = useRef(scale);
  const lastTapRef = useRef(0);
  const pinchingRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !gesturesEnabled) {
      return;
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        touchStartRef.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }

      if (event.touches.length === 2) {
        pinchingRef.current = true;
        touchStartRef.current = null;
        pinchStartRef.current = {
          distance: touchDistance(event.touches),
          scale: scaleRef.current,
          armed: false,
        };
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchStartRef.current) {
        return;
      }

      const distance = touchDistance(event.touches);
      if (distance <= 0 || pinchStartRef.current.distance <= 0) {
        return;
      }

      const delta = Math.abs(distance - pinchStartRef.current.distance);
      if (!pinchStartRef.current.armed) {
        if (delta < PINCH_ACTIVATION_PX) {
          return;
        }
        pinchStartRef.current.armed = true;
      }

      event.preventDefault();
      const ratio = distance / pinchStartRef.current.distance;
      onPinchScale(pinchStartRef.current.scale * ratio);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2 && pinchStartRef.current) {
        const didPinch = pinchStartRef.current.armed;
        pinchStartRef.current = null;
        if (didPinch) {
          onPinchEnd();
        }
        window.setTimeout(() => {
          pinchingRef.current = false;
        }, 400);
      }

      if (
        event.touches.length === 0 &&
        event.changedTouches.length === 1 &&
        !pinchingRef.current
      ) {
        const start = touchStartRef.current;
        const end = event.changedTouches[0];
        touchStartRef.current = null;

        if (start) {
          const moved = Math.hypot(end.clientX - start.x, end.clientY - start.y);
          if (moved > DOUBLE_TAP_MOVE_PX) {
            lastTapRef.current = 0;
            return;
          }
        }

        const now = Date.now();
        if (now - lastTapRef.current < 320) {
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
  }, [containerRef, gesturesEnabled, onDoubleTap, onPinchEnd, onPinchScale]);

  return (
    <div
      ref={containerRef}
      className={`chord-chart-viewport relative w-full max-w-full ${className}`}
      style={{
        touchAction: gesturesEnabled ? "pan-y" : "pan-y",
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
