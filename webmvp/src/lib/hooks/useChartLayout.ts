"use client";

import { useEffect, useRef, useState } from "react";

import { CHART_SCALE_MAX, CHART_SCALE_MIN } from "@/lib/performancePreferences";
import { charsPerLine, MONO_CHAR_WIDTH_RATIO } from "@/lib/wrapLyricLine";

const BASE_FONT_SIZE = 18;

export function useChartLayout(scale: number, enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxChars, setMaxChars] = useState(32);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const el = containerRef.current;
    if (!el) {
      return;
    }

    const update = () => {
      const width = el.clientWidth;
      const fontSize = BASE_FONT_SIZE * Math.min(CHART_SCALE_MAX, Math.max(CHART_SCALE_MIN, scale));
      setMaxChars(charsPerLine(width, fontSize));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, scale]);

  return {
    containerRef,
    maxChars,
    baseFontSize: BASE_FONT_SIZE,
    charWidthRatio: MONO_CHAR_WIDTH_RATIO,
  };
}
