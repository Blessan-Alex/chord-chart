"use client";

import { useEffect, useRef } from "react";

import { ChordRow } from "@/components/ChordRow";
import { normalizeChordMark } from "@/lib/chordMarks";
import {
  collapseSelectionToWord,
  getFocusOffsetInElement,
  getSelectionRangeInElement,
  setSelectionRangeInElement,
} from "@/lib/hooks/useTextSelection";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { Key } from "@/lib/engine";
import type { LyricLine } from "@/lib/types";

type LyricLineEditorProps = {
  line: LyricLine;
  originalKey: Key;
  sectionIndex: number;
  lineIndex: number;
  selectionRange?: { start: number; end: number } | null;
  onSelection: (range: { start: number; end: number }) => void;
  onChordClick: (mark: ReturnType<typeof normalizeChordMark>) => void;
};

export function LyricLineEditor({
  line,
  originalKey,
  sectionIndex,
  lineIndex,
  selectionRange,
  onSelection,
  onChordClick,
}: LyricLineEditorProps) {
  const lyricRef = useRef<HTMLDivElement>(null);
  const onSelectionRef = useRef(onSelection);
  const isMobile = useIsMobile();
  const normalizedLine = {
    lyrics: line.lyrics,
    chords: line.chords.map(normalizeChordMark),
  };

  useEffect(() => {
    onSelectionRef.current = onSelection;
  }, [onSelection]);

  useEffect(() => {
    const element = lyricRef.current;
    if (!element || !selectionRange) {
      return;
    }

    window.requestAnimationFrame(() => {
      setSelectionRangeInElement(
        element,
        selectionRange.start,
        selectionRange.end,
      );
    });
  }, [selectionRange]);

  useEffect(() => {
    const element = lyricRef.current;
    if (!element) {
      return;
    }

    const notifySelection = () => {
      const range = getSelectionRangeInElement(element);
      if (!range || range.end <= range.start) {
        return;
      }

      let { start, end } = range;

      if (isMobile) {
        const selectedLength = end - start;
        const isWideSelection =
          selectedLength > 24 || selectedLength >= line.lyrics.length * 0.6;
        if (isWideSelection) {
          const focusOffset = getFocusOffsetInElement(element);
          ({ start, end } = collapseSelectionToWord(
            line.lyrics,
            start,
            end,
            focusOffset ?? undefined,
          ));
          setSelectionRangeInElement(element, start, end);
        }
      }

      if (end <= start) {
        return;
      }

      onSelectionRef.current({ start, end });
    };

    if (isMobile) {
      const handleTouchEnd = () => {
        window.setTimeout(notifySelection, 80);
      };

      element.addEventListener("touchend", handleTouchEnd);
      return () => {
        element.removeEventListener("touchend", handleTouchEnd);
      };
    }

    const handleMouseUp = () => {
      window.setTimeout(notifySelection, 0);
    };

    element.addEventListener("mouseup", handleMouseUp);
    return () => {
      element.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isMobile, line.lyrics]);

  return (
    <div className="chord-line relative mb-3">
      <ChordRow
        chords={normalizedLine.chords}
        originalKey={originalKey}
        targetKey={originalKey}
        viewMode="chords"
        onChordClick={onChordClick}
      />

      <div
        ref={lyricRef}
        data-section-index={sectionIndex}
        data-line-index={lineIndex}
        className="lyric-row lyric-editor-line cursor-text whitespace-pre px-1 py-0.5 hover:bg-lf-bg-muted/40"
      >
        {normalizedLine.lyrics}
      </div>
    </div>
  );
}
