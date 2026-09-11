"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CHART_SCALE_MAX,
  CHART_SCALE_MIN,
  clampChartScale,
  readGlobalZoom,
  readSessionZoom,
  snapChartScale,
  writeGlobalZoom,
  writeSessionZoom,
} from "@/lib/performancePreferences";

type UseChartZoomOptions = {
  sessionId?: string | null;
};

function pointerDistance(
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number },
): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function useChartZoom({ sessionId }: UseChartZoomOptions = {}) {
  const [scale, setScaleState] = useState(1);
  const [showIndicator, setShowIndicator] = useState(false);
  const scaleRef = useRef(1);
  const indicatorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointersRef = useRef(new Map<number, { clientX: number; clientY: number }>());
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    const sessionZoom = sessionId ? readSessionZoom(sessionId) : null;
    const initial = sessionZoom ?? readGlobalZoom();
    scaleRef.current = initial;
    setScaleState(initial);
  }, [sessionId]);

  const persistScale = useCallback(
    (next: number) => {
      writeGlobalZoom(next);
      if (sessionId) {
        writeSessionZoom(sessionId, next);
      }
    },
    [sessionId],
  );

  const flashIndicator = useCallback(() => {
    setShowIndicator(true);
    if (indicatorTimeout.current) {
      clearTimeout(indicatorTimeout.current);
    }
    indicatorTimeout.current = setTimeout(() => {
      setShowIndicator(false);
    }, 1200);
  }, []);

  const setScale = useCallback(
    (next: number, options: { persist?: boolean; indicate?: boolean } = {}) => {
      const snapped = snapChartScale(next);
      scaleRef.current = snapped;
      setScaleState(snapped);
      if (options.persist !== false) {
        persistScale(snapped);
      }
      if (options.indicate !== false) {
        flashIndicator();
      }
    },
    [flashIndicator, persistScale],
  );

  const zoomIn = useCallback(() => {
    setScale(scaleRef.current + 0.1);
  }, [setScale]);

  const zoomOut = useCallback(() => {
    setScale(scaleRef.current - 0.1);
  }, [setScale]);

  const resetZoom = useCallback(() => {
    setScale(1);
  }, [setScale]);

  const toggleZoomPreset = useCallback(() => {
    const next = scaleRef.current >= 1.4 ? 1 : 1.5;
    setScale(next);
  }, [setScale]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      pinchStartRef.current = {
        distance: pointerDistance(pts[0], pts[1]),
        scale: scaleRef.current,
      };
    }
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return;
      }
      pointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });

      if (pointersRef.current.size < 2 || !pinchStartRef.current) {
        return;
      }

      const pts = Array.from(pointersRef.current.values());
      const distance = pointerDistance(pts[0], pts[1]);
      const ratio = distance / pinchStartRef.current.distance;
      const next = clampChartScale(pinchStartRef.current.scale * ratio);
      scaleRef.current = next;
      setScaleState(next);
      flashIndicator();
    },
    [flashIndicator],
  );

  const endPointer = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size < 2) {
        if (pinchStartRef.current) {
          persistScale(snapChartScale(scaleRef.current));
          pinchStartRef.current = null;
        }
      }
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore if capture was not set
      }
    },
    [persistScale],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === "touch") {
        const now = Date.now();
        if (now - lastTapRef.current < 300 && pointersRef.current.size <= 1) {
          toggleZoomPreset();
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      }
      endPointer(event);
    },
    [endPointer, toggleZoomPreset],
  );

  useEffect(
    () => () => {
      if (indicatorTimeout.current) {
        clearTimeout(indicatorTimeout.current);
      }
    },
    [],
  );

  return {
    scale,
    scalePercent: Math.round(scale * 100),
    showIndicator,
    zoomIn,
    zoomOut,
    resetZoom,
    setScale,
    pinchHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: endPointer,
    },
    scaleBounds: { min: CHART_SCALE_MIN, max: CHART_SCALE_MAX },
  };
}
