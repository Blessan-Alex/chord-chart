"use client";

import { useCallback } from "react";

import { graphemeRangeAt, snapRangeToGraphemes } from "@/lib/graphemeUtils";
import { createLyricRange } from "@/lib/lyricMeasurement";

export type TextSelectionRange = {
  start: number;
  end: number;
  text: string;
};

function measureRangeOffset(element: HTMLElement, container: Node, offset: number): number {
  const preRange = document.createRange();
  preRange.selectNodeContents(element);
  try {
    preRange.setEnd(container, offset);
  } catch {
    return 0;
  }
  return preRange.toString().length;
}

export function getSelectionRangeInElement(
  element: HTMLElement,
  lyricsText?: string,
): TextSelectionRange | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!element.contains(range.commonAncestorContainer)) {
    return null;
  }

  const start = measureRangeOffset(element, range.startContainer, range.startOffset);
  const end = measureRangeOffset(element, range.endContainer, range.endOffset);

  if (end <= start) {
    return null;
  }

  const referenceText = lyricsText ?? element.textContent ?? "";
  const snapped = snapRangeToGraphemes(referenceText, start, end);

  return {
    start: snapped.start,
    end: snapped.end,
    text: referenceText.slice(snapped.start, snapped.end),
  };
}

/** Collapsed caret / tap position as a single grapheme range. */
export function getCaretGraphemeRangeInElement(
  element: HTMLElement,
  lyricsText: string,
): TextSelectionRange | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  if (!selection.isCollapsed) {
    return null;
  }

  const focusNode = selection.focusNode;
  if (!focusNode || !element.contains(focusNode)) {
    return null;
  }

  const index = measureRangeOffset(element, focusNode, selection.focusOffset);
  const { start, end } = graphemeRangeAt(lyricsText, index);

  if (end <= start) {
    return null;
  }

  return {
    start,
    end,
    text: lyricsText.slice(start, end),
  };
}

/** Restore a character range inside a lyric element (supports `<mark>` overlays). */
export function setSelectionRangeInElement(
  element: HTMLElement,
  start: number,
  end: number,
): void {
  const range = createLyricRange(element, start, end);
  if (!range) {
    return;
  }

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Character offset of the selection focus (where the user lifted / ended). */
export function getFocusOffsetInElement(element: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const focusNode = selection.focusNode;
  if (!focusNode || !element.contains(focusNode)) {
    return null;
  }

  return measureRangeOffset(element, focusNode, selection.focusOffset);
}

/** Collapse an over-wide mobile selection down to a single word (grapheme-safe). */
export function collapseSelectionToWord(
  text: string,
  start: number,
  end: number,
  preferredIndex?: number,
): { start: number; end: number } {
  if (!text || end <= start) {
    return { start, end };
  }

  const selectedLength = end - start;
  if (selectedLength < text.length * 0.6) {
    return snapRangeToGraphemes(text, start, end);
  }

  const anchor =
    preferredIndex !== undefined
      ? Math.max(0, Math.min(preferredIndex, text.length - 1))
      : Math.min(start, text.length - 1);
  let wordStart = anchor;
  let wordEnd = anchor + 1;

  while (wordStart > 0 && !/\s/u.test(text[wordStart - 1]!)) {
    wordStart -= 1;
  }
  while (wordEnd < text.length && !/\s/u.test(text[wordEnd]!)) {
    wordEnd += 1;
  }

  if (wordEnd <= wordStart) {
    return snapRangeToGraphemes(text, start, end);
  }

  return snapRangeToGraphemes(text, wordStart, wordEnd);
}

export function useTextSelection() {
  const readSelection = useCallback((element: HTMLElement | null, lyricsText?: string) => {
    if (!element) {
      return null;
    }
    return getSelectionRangeInElement(element, lyricsText);
  }, []);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
  }, []);

  return { readSelection, clearSelection };
}
