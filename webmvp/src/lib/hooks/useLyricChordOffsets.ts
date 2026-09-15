"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

import { measureChordOffsets } from "@/lib/lyricMeasurement";

/** Stable default — avoids new [] references on every render. */
export const EMPTY_CHORD_INDICES: readonly number[] = [];

function parseIndicesKey(key: string): number[] {
  if (!key) {
    return [];
  }

  return key
    .split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0);
}

export function useLyricChordOffsets(
  lyricRef: RefObject<HTMLElement | null>,
  lyrics: string,
  chordStarts: readonly number[],
  extraIndices: readonly number[] = EMPTY_CHORD_INDICES,
  /** Changes when lyric layout shifts without lyric/chord data changing (e.g. selection mark). */
  layoutKey = "",
): Record<number, number> {
  const [offsets, setOffsets] = useState<Record<number, number>>({});
  const startsKey = chordStarts.join(",");
  const extraKey = extraIndices.join(",");

  useLayoutEffect(() => {
    const element = lyricRef.current;
    if (!element || typeof window === "undefined") {
      return;
    }

    const measure = () => {
      const unique = [
        ...new Set([
          ...parseIndicesKey(startsKey),
          ...parseIndicesKey(extraKey),
        ]),
      ];
      setOffsets(measureChordOffsets(element, unique));
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(element);

    if (document.fonts) {
      void document.fonts.ready.then(measure);
    }

    return () => {
      observer.disconnect();
    };
  }, [lyricRef, lyrics, startsKey, extraKey, layoutKey]);

  return offsets;
}
