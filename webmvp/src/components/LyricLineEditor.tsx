"use client";

import { useEffect, useMemo, useRef } from "react";

import { ChordRow } from "@/components/ChordRow";
import { createChordMark } from "@/lib/chordMarks";
import {
  describeSlot,
  gapPreviewAnchor,
  gapZonesForLine,
  gapMeasurementIndices,
  slotFromCaret,
  slotPosition,
  type PlacementSlot,
} from "@/lib/chordPlacement";
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
  getFocusOffsetInElement,
  getSelectionRangeInElement,
} from "@/lib/hooks/useTextSelection";
import type { Key } from "@/lib/engine";
import type { ChordMark, LyricLine } from "@/lib/types";

const LINE_START_ZONE_PX = 14;
const LINE_END_ZONE_PX = 48;

function isWhitespaceChar(char: string | undefined): boolean {
  return char !== undefined && /\s/u.test(char);
}

function gapCaretIndex(line: LyricLine, slot: PlacementSlot): number | undefined {
  if (slot.kind === "gap") {
    return gapPreviewAnchor(line, slot.index);
  }
  if (slot.kind === "char" && isWhitespaceChar(line.lyrics[slot.start])) {
    return slot.start;
  }
  return undefined;
}

type LyricLineEditorProps = {
  line: LyricLine;
  originalKey: Key;
  sectionIndex: number;
  lineIndex: number;
  /** Slot currently being placed on this line, if any. */
  activeSlot?: PlacementSlot | null;
  pendingChord?: string;
  onPlaceSlot: (slot: PlacementSlot) => void;
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
  activeSlot,
  pendingChord = "",
  onPlaceSlot,
  onChordClick,
}: LyricLineEditorProps) {
  const lyricRef = useRef<HTMLDivElement>(null);
  const onPlaceSlotRef = useRef(onPlaceSlot);
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

  const gapZones = useMemo(() => gapZonesForLine(line), [line]);

  const charStart = activeSlot?.kind === "char" ? activeSlot.start : undefined;
  const charEnd = activeSlot?.kind === "char" ? activeSlot.end : undefined;
  const charRange =
    charStart !== undefined && charEnd !== undefined
      ? { start: charStart, end: charEnd }
      : null;

  const extraIndices = useMemo(() => {
    const indices = gapMeasurementIndices(line);
    if (activeSlot) {
      const caret = gapCaretIndex(line, activeSlot);
      indices.push(caret ?? slotPosition(activeSlot));
    }
    return indices.length > 0 ? indices : EMPTY_CHORD_INDICES;
  }, [line, activeSlot]);

  const layoutKey =
    charStart !== undefined ? `${charStart}-${charEnd ?? charStart}` : "";

  const chordOffsets = useLyricChordOffsets(
    lyricRef,
    line.lyrics,
    chordStarts,
    extraIndices,
    layoutKey,
  );

  const previewMark = useMemo((): ChordMark | null => {
    if (!pendingChord.trim() || charStart === undefined || charEnd === undefined) {
      return null;
    }
    return createChordMark(pendingChord, charStart, charEnd);
  }, [pendingChord, charStart, charEnd]);

  const ghost = useMemo(() => {
    if (!activeSlot) {
      return null;
    }
    const anchor = gapCaretIndex(line, activeSlot);
    if (anchor === undefined) {
      return null;
    }
    const left = chordOffsets[anchor];
    if (left === undefined) {
      return null;
    }
    return { left, label: pendingChord.trim() || "+" };
  }, [activeSlot, chordOffsets, line, pendingChord]);

  useEffect(() => {
    onPlaceSlotRef.current = onPlaceSlot;
  }, [onPlaceSlot]);

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

      if (line.lyrics.slice(start, end).trim() === "") {
        onPlaceSlotRef.current({ kind: "gap", index: start });
        return;
      }

      onPlaceSlotRef.current({ kind: "char", start, end });
    };

    const scheduleNotify = () => {
      if (debounce) {
        clearTimeout(debounce);
      }
      debounce = setTimeout(notifySelection, touchEditor ? 150 : 0);
    };

    /** Collapsed caret / tap: resolve to a char or gap slot. */
    const placeAtCaret = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        return;
      }

      const offset = getFocusOffsetInElement(element);
      if (offset === null) {
        return;
      }

      onPlaceSlotRef.current(slotFromCaret(line.lyrics, offset));
    };

    if (touchEditor) {
      const handleSelectionChange = () => {
        scheduleNotify();
      };
      const handleTouchEnd = () => {
        setTimeout(placeAtCaret, 80);
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      element.addEventListener("touchend", handleTouchEnd);

      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        element.removeEventListener("touchend", handleTouchEnd);
        if (debounce) {
          clearTimeout(debounce);
        }
      };
    }

    const handleMouseUp = () => {
      scheduleNotify();
    };
    const handleClick = () => {
      placeAtCaret();
    };

    element.addEventListener("mouseup", handleMouseUp);
    element.addEventListener("click", handleClick);
    return () => {
      element.removeEventListener("mouseup", handleMouseUp);
      element.removeEventListener("click", handleClick);
      if (debounce) {
        clearTimeout(debounce);
      }
    };
  }, [touchEditor, line.lyrics]);

  const activeGapLeft = useMemo(() => {
    if (!activeSlot) {
      return undefined;
    }
    const anchor = gapCaretIndex(line, activeSlot);
    if (anchor === undefined) {
      return undefined;
    }
    return chordOffsets[anchor];
  }, [activeSlot, chordOffsets, line]);

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
        ghost={ghost}
        onChordClick={onChordClick}
      />

      <div className="relative">
        <div
          ref={lyricRef}
          data-section-index={sectionIndex}
          data-line-index={lineIndex}
          className="lyric-row lyric-editor-line lyric-line-measured cursor-text whitespace-pre px-1 py-0.5 hover:bg-lf-bg-muted/40"
        >
          {charRange
            ? renderLyricsWithTarget(line.lyrics, charRange)
            : line.lyrics}
        </div>

        {/* Overlay is a sibling with no text nodes so lyric measurement stays exact. */}
        <div className="lyric-gap-layer pointer-events-none absolute inset-0">
          {gapZones.map((zone) => {
            const left = chordOffsets[zone.index];
            if (left === undefined) {
              return null;
            }

            const right = chordOffsets[zone.endIndex] ?? left;
            // Zones stay inside the whitespace they represent: widening them would
            // steal the neighbouring glyph's own pixels and cost letter precision.
            const runWidth = Math.max(right - left, 0);
            let zoneLeft = left;
            let zoneWidth = runWidth;

            if (zone.kind === "lineStart") {
              zoneLeft = left - LINE_START_ZONE_PX + 2;
              zoneWidth = LINE_START_ZONE_PX;
            } else if (zone.kind === "lineEnd") {
              zoneWidth = runWidth + LINE_END_ZONE_PX;
            }

            const isActive =
              activeSlot?.kind === "gap"
                ? activeSlot.index === zone.index
                : activeSlot?.kind === "char" &&
                  activeSlot.start >= zone.index &&
                  activeSlot.start < zone.endIndex;

            return (
              <button
                key={`gap-${zone.index}`}
                type="button"
                aria-label={describeSlot(line, { kind: "gap", index: zone.index })}
                aria-pressed={isActive}
                className={`lyric-gap-zone pointer-events-auto${
                  isActive ? " lyric-gap-zone--active" : ""
                }`}
                style={{ left: `${zoneLeft}px`, width: `${zoneWidth}px` }}
                onClick={() => onPlaceSlot({ kind: "gap", index: zone.index })}
              />
            );
          })}

          {activeGapLeft !== undefined ? (
            <span
              className="lyric-gap-caret"
              style={{ left: `${activeGapLeft}px` }}
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
