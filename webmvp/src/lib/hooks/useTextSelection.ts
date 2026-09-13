"use client";

import { useCallback } from "react";

export type TextSelectionRange = {
  start: number;
  end: number;
  text: string;
};

export function getSelectionRangeInElement(
  element: HTMLElement,
): TextSelectionRange | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!element.contains(range.commonAncestorContainer)) {
    return null;
  }

  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;
  const text = range.toString();
  const end = start + text.length;

  if (end <= start) {
    return null;
  }

  return { start, end, text };
}

export function useTextSelection() {
  const readSelection = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return null;
    }
    return getSelectionRangeInElement(element);
  }, []);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
  }, []);

  return { readSelection, clearSelection };
}
