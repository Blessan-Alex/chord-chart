"use client";

import { useEffect, useRef } from "react";

import { ChordRow } from "@/components/ChordRow";
import { normalizeChordMark } from "@/lib/chordMarks";
import {
  collapseSelectionToWord,
  getFocusOffsetInElement,
  getSelectionRangeInElement,
} from "@/lib/hooks/useTextSelection";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { Key } from "@/lib/engine";
import type { LyricLine } from "@/lib/types";

type LyricLineEditorProps = {
  line: LyricLine;
  originalKey: Key;
  sectionIndex: number;
  lineIndex: number;
  activeStart?: number | null;
  onSelection: (range: { start: number; end: number }) => void;
  onChordClick: (mark: ReturnType<typeof normalizeChordMark>) => void;
};

export function LyricLineEditor({
  line,
  originalKey,
  sectionIndex,
  lineIndex,
  activeStart,
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
    if (!element) {
      return;
    }

    const notifySelection = (collapseToWord: boolean) => {
      const range = getSelectionRangeInElement(element);
      if (!range) {
        return;
      }

      let { start, end } = range;
      if (collapseToWord) {
        const focusOffset = getFocusOffsetInElement(element);
        ({ start, end } = collapseSelectionToWord(
          line.lyrics,
          start,
          end,
          focusOffset ?? undefined,
        ));
      }

      if (end <= start) {
        return;
      }

      onSelectionRef.current({ start, end });
    };

    if (isMobile) {
      const handleTouchEnd = () => {
        window.setTimeout(() => notifySelection(true), 80);
      };

      element.addEventListener("touchend", handleTouchEnd);
      return () => {
        element.removeEventListener("touchend", handleTouchEnd);
      };
    }

    const handleSelectionChange = () => {
      notifySelection(false);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
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
        className={`lyric-row lyric-editor-line cursor-text whitespace-pre-wrap break-words rounded-[var(--lf-radius-sm)] px-1 py-0.5 ${
          activeStart !== null && activeStart !== undefined
            ? "bg-lf-bg-active ring-1 ring-lf-brand/30"
            : "hover:bg-lf-bg-muted/60"
        }`}
      >
        {normalizedLine.lyrics}
      </div>
    </div>
  );
}
