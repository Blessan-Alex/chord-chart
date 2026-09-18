"use client";

import { useEffect, useMemo, useRef } from "react";

import { ChordRow } from "@/components/ChordRow";
import { createChordMark } from "@/lib/chordMarks";
import { isChordOnlyLine } from "@/lib/chordProParser";
import {
  EMPTY_CHORD_INDICES,
  useLyricChordOffsets,
} from "@/lib/hooks/useLyricChordOffsets";
import { useTouchEditor } from "@/lib/hooks/useTouchEditor";
import {
  lyricChordStarts,
  lyricChordsSignature,
  normalizeLyricChords,
} from "@/lib/lyricChords";
import {
  collapseSelectionToWord,
  getCaretGraphemeRangeInElement,
  getFocusOffsetInElement,
  getSelectionRangeInElement,
} from "@/lib/hooks/useTextSelection";
import type { Key } from "@/lib/engine";
import type { ChordMark, LyricLine } from "@/lib/types";

type LyricLineEditorProps = {
  line: LyricLine;
  originalKey: Key;
  sectionIndex: number;
  lineIndex: number;
  selectionRange?: { start: number; end: number } | null;
  pendingPlacement?: { start: number; end: number; chord: string } | null;
  onSelection: (range: { start: number; end: number }) => void;
  onChordClick: (mark: ChordMark) => void;
};

function renderLyricsWithTarget(
  lyrics: string,
  range: { start: number; end: number } | null | undefined,
) {
  if (!range || range.end <= range.start) {
    return lyrics;
  }

  const { start, end } = range;
  const safeStart = Math.max(0, Math.min(start, lyrics.length));
  const safeEnd = Math.max(safeStart, Math.min(end, lyrics.length));

  if (safeEnd <= safeStart) {
    return lyrics;
  }

  return (
    <>
      {lyrics.slice(0, safeStart)}
      <mark className="lyric-chord-target">{lyrics.slice(safeStart, safeEnd)}</mark>
      {lyrics.slice(safeEnd)}
    </>
  );
}

export function LyricLineEditor({
  line,
  originalKey,
  sectionIndex,
  lineIndex,
  selectionRange,
  pendingPlacement,
  onSelection,
  onChordClick,
}: LyricLineEditorProps) {
  const lyricRef = useRef<HTMLDivElement>(null);
  const onSelectionRef = useRef(onSelection);
  const touchEditor = useTouchEditor();
  const chordsSignature = lyricChordsSignature(line.chords);
  const normalizedChords = useMemo(
    () => normalizeLyricChords(line.chords),
    [chordsSignature],
  );
  const chordStarts = useMemo(
    () => lyricChordStarts(line.chords),
    [chordsSignature],
  );

  const pendingStart = pendingPlacement?.start;
  const pendingEnd = pendingPlacement?.end;
  const pendingChord = pendingPlacement?.chord ?? "";

  const extraIndices = useMemo(
    () => (pendingChord.trim() && pendingStart !== undefined ? [pendingStart] : EMPTY_CHORD_INDICES),
    [pendingStart, pendingChord],
  );

  const layoutKey = selectionRange
    ? `${selectionRange.start}-${selectionRange.end}`
    : "";

  const chordOffsets = useLyricChordOffsets(
    lyricRef,
    line.lyrics,
    chordStarts,
    extraIndices,
    layoutKey,
  );

  const previewMark = useMemo((): ChordMark | null => {
    if (!pendingChord.trim() || pendingStart === undefined || pendingEnd === undefined) {
      return null;
    }

    return createChordMark(pendingChord, pendingStart, pendingEnd);
  }, [pendingChord, pendingStart, pendingEnd]);

  useEffect(() => {
    onSelectionRef.current = onSelection;
  }, [onSelection]);

  useEffect(() => {
    const element = lyricRef.current;
    if (!element) {
      return;
    }

    let debounce: ReturnType<typeof setTimeout> | null = null;

    const notifySelection = () => {
      const range = getSelectionRangeInElement(element, line.lyrics);
      if (!range || range.end <= range.start) {
        return;
      }

      let { start, end } = range;

      if (touchEditor) {
        const selectedLength = end - start;
        const isWideSelection = selectedLength >= line.lyrics.length * 0.6;
        if (isWideSelection) {
          const focusOffset = getFocusOffsetInElement(element);
          ({ start, end } = collapseSelectionToWord(
            line.lyrics,
            start,
            end,
            focusOffset ?? undefined,
          ));
        }
      }

      if (end <= start) {
        return;
      }

      onSelectionRef.current({ start, end });
    };

    const scheduleNotify = () => {
      if (debounce) {
        clearTimeout(debounce);
      }
      debounce = setTimeout(notifySelection, touchEditor ? 150 : 0);
    };

    const handleTapPlacement = () => {
      if (!touchEditor) {
        return;
      }

      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          return;
        }

        const caret = getCaretGraphemeRangeInElement(element, line.lyrics);
        if (caret) {
          onSelectionRef.current({ start: caret.start, end: caret.end });
        }
      }, 80);
    };

    if (touchEditor) {
      const handleSelectionChange = () => {
        scheduleNotify();
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      element.addEventListener("touchend", handleTapPlacement);

      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        element.removeEventListener("touchend", handleTapPlacement);
        if (debounce) {
          clearTimeout(debounce);
        }
      };
    }

    const handleMouseUp = () => {
      scheduleNotify();
    };

    element.addEventListener("mouseup", handleMouseUp);
    return () => {
      element.removeEventListener("mouseup", handleMouseUp);
      if (debounce) {
        clearTimeout(debounce);
      }
    };
  }, [touchEditor, line.lyrics]);

  const showTargetOverlay = Boolean(selectionRange);

  return (
    <div className="chord-line relative mb-3">
      <ChordRow
        chords={normalizedChords}
        originalKey={originalKey}
        targetKey={originalKey}
        viewMode="chords"
        chordOffsets={chordOffsets}
        packed={isChordOnlyLine(line)}
        previewMark={previewMark}
        onChordClick={onChordClick}
      />

      <div
        ref={lyricRef}
        data-section-index={sectionIndex}
        data-line-index={lineIndex}
        className="lyric-row lyric-editor-line lyric-line-measured cursor-text whitespace-pre px-1 py-0.5 hover:bg-lf-bg-muted/40"
      >
        {showTargetOverlay
          ? renderLyricsWithTarget(line.lyrics, selectionRange)
          : line.lyrics}
      </div>
    </div>
  );
}
