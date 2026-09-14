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

/** Restore a character range selection inside a plain-text lyric element. */
export function setSelectionRangeInElement(
  element: HTMLElement,
  start: number,
  end: number,
): void {
  const textNode = element.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const length = textNode.textContent?.length ?? 0;
  const safeStart = Math.max(0, Math.min(start, length));
  const safeEnd = Math.max(safeStart, Math.min(end, length));

  const range = document.createRange();
  range.setStart(textNode, safeStart);
  range.setEnd(textNode, safeEnd);

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

  const preRange = document.createRange();
  preRange.selectNodeContents(element);
  try {
    preRange.setEnd(focusNode, selection.focusOffset);
  } catch {
    return null;
  }

  return preRange.toString().length;
}

/** Collapse an over-wide mobile selection down to a single word. */
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
  if (
    selectedLength > 0 &&
    selectedLength <= 24 &&
    selectedLength < text.length * 0.6
  ) {
    return { start, end };
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
    return { start, end };
  }

  return { start: wordStart, end: wordEnd };
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
