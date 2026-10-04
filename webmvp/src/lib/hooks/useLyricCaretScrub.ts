"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { caretIndexFromPointer } from "@/lib/lyricCaretHitTest";

type UseLyricCaretScrubOptions = {
  lyrics: string;
  enabled: boolean;
  onCommit: (caretIndex: number) => void;
};

export function useLyricCaretScrub({
  lyrics,
  enabled,
  onCommit,
}: UseLyricCaretScrubOptions) {
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const activePointerId = useRef<number | null>(null);

  const updateFromEvent = useCallback(
    (element: HTMLElement, clientX: number) => {
      const index = caretIndexFromPointer(element, clientX, lyrics.length);
      setScrubIndex(index);
      return index;
    },
    [lyrics.length],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || event.button !== 0) {
        return;
      }

      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      activePointerId.current = event.pointerId;

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(8);
      }

      window.getSelection()?.removeAllRanges();
      updateFromEvent(target, event.clientX);
    },
    [enabled, updateFromEvent],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (activePointerId.current !== event.pointerId) {
        return;
      }
      updateFromEvent(event.currentTarget, event.clientX);
    },
    [updateFromEvent],
  );

  const finishScrub = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (activePointerId.current !== event.pointerId) {
        return;
      }

      const target = event.currentTarget;
      const index = updateFromEvent(target, event.clientX);

      activePointerId.current = null;
      setScrubIndex(null);

      try {
        target.releasePointerCapture(event.pointerId);
      } catch {
        // Already released.
      }

      onCommit(index);
    },
    [onCommit, updateFromEvent],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      finishScrub(event);
    },
    [finishScrub],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (activePointerId.current !== event.pointerId) {
        return;
      }
      activePointerId.current = null;
      setScrubIndex(null);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Already released.
      }
    },
    [],
  );

  const isScrubbing = scrubIndex !== null;

  return {
    scrubIndex,
    isScrubbing,
    scrubHandlers: enabled
      ? {
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel,
        }
      : {},
  };
}
