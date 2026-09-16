"use client";

import { useLayoutEffect, useMemo, useState, type RefObject } from "react";

import {
  maxTierUsed,
  resolveChordLayout,
  type ChordLayoutPlacement,
} from "@/lib/chordLayout";
import {
  CHORD_LABEL_FALLBACK_FONT,
  chordRowFontFromElement,
  measureChordLabelWidths,
} from "@/lib/chordLabelMeasure";

const EMPTY_PLACEMENTS: ChordLayoutPlacement[] = [];

function computePlacements(
  chordStarts: readonly number[],
  displayLabels: readonly string[],
  anchorOffsets: Record<number, number>,
  font: string,
): ChordLayoutPlacement[] {
  const widths = measureChordLabelWidths(displayLabels, font);
  const anchorLeft = chordStarts.map((start) => anchorOffsets[start] ?? 0);

  return resolveChordLayout({
    starts: [...chordStarts],
    anchorLeft,
    width: widths,
  });
}

export function useChordRowLayout(
  chordRowRef: RefObject<HTMLElement | null>,
  chordStarts: readonly number[],
  displayLabels: readonly string[],
  anchorOffsets: Record<number, number> | undefined,
): { placements: ChordLayoutPlacement[]; tierCount: number } {
  const startsKey = chordStarts.join(",");
  const labelsKey = displayLabels.join("\u0001");
  const anchorKey =
    anchorOffsets && chordStarts.length > 0
      ? chordStarts.map((start) => anchorOffsets[start] ?? -1).join(",")
      : "";

  const provisional = useMemo(() => {
    if (
      !anchorOffsets ||
      chordStarts.length === 0 ||
      chordStarts.length !== displayLabels.length
    ) {
      return EMPTY_PLACEMENTS;
    }

    const element = chordRowRef.current;
    const font = element
      ? chordRowFontFromElement(element)
      : CHORD_LABEL_FALLBACK_FONT;

    return computePlacements(
      chordStarts,
      displayLabels,
      anchorOffsets,
      font,
    );
  }, [chordRowRef, chordStarts, displayLabels, anchorOffsets, startsKey, labelsKey, anchorKey]);

  const [refined, setRefined] = useState<ChordLayoutPlacement[] | null>(null);

  useLayoutEffect(() => {
    if (
      typeof window === "undefined" ||
      !anchorOffsets ||
      chordStarts.length === 0 ||
      chordStarts.length !== displayLabels.length
    ) {
      setRefined(null);
      return;
    }

    const measure = () => {
      const element = chordRowRef.current;
      const font = chordRowFontFromElement(element);
      setRefined(
        computePlacements(chordStarts, displayLabels, anchorOffsets, font),
      );
    };

    measure();

    const element = chordRowRef.current;
    if (!element) {
      return;
    }

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
  }, [chordRowRef, startsKey, labelsKey, anchorKey, anchorOffsets, chordStarts, displayLabels]);

  const placements =
    refined && refined.length === chordStarts.length ? refined : provisional;

  const tierCount =
    placements.length > 0 ? maxTierUsed(placements) + 1 : 1;

  return { placements, tierCount };
}
