"use client";

import { useEffect, useRef } from "react";

import { ChordRow } from "@/components/ChordRow";
import { normalizeChordMark } from "@/lib/chordMarks";
import { getSelectionRangeInElement } from "@/lib/hooks/useTextSelection";
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

    const notifySelection = () => {
      const range = getSelectionRangeInElement(element);
      if (range) {
        onSelectionRef.current({ start: range.start, end: range.end });
      }
    };

    const handleSelectionChange = () => {
      notifySelection();
    };

    const handleTouchEnd = () => {
      requestAnimationFrame(notifySelection);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    element.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [line.lyrics]);

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
        className={`lyric-row lyric-editor-line whitespace-pre-wrap break-words ${
          activeStart !== null && activeStart !== undefined
            ? "ring-1 ring-lf-brand/20"
            : ""
        }`}
      >
        {normalizedLine.lyrics}
      </div>
    </div>
  );
}
