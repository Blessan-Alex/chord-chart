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

export function useChartZoom({ sessionId }: UseChartZoomOptions = {}) {
  const [scale, setScaleState] = useState(1);
  const [showIndicator, setShowIndicator] = useState(false);
  const scaleRef = useRef(1);
  const indicatorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    }, 1500);
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

  const setScaleLive = useCallback(
    (next: number) => {
      const snapped = clampChartScale(next);
      scaleRef.current = snapped;
      setScaleState(snapped);
      flashIndicator();
    },
    [flashIndicator],
  );

  const commitScale = useCallback(() => {
    persistScale(snapChartScale(scaleRef.current));
  }, [persistScale]);

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
    setScaleLive,
    commitScale,
    toggleZoomPreset,
    scaleBounds: { min: CHART_SCALE_MIN, max: CHART_SCALE_MAX },
  };
}
