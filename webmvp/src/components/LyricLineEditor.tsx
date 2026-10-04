"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { ChordRow } from "@/components/ChordRow";
import { createChordMark } from "@/lib/chordMarks";
import {
  describeSlot,
  gapPreviewAnchor,
  gapZonesForLine,
  gapMeasurementIndices,
  slotFromCaret,
  slotFromSelection,
  slotPosition,
  type PlacementSlot,
} from "@/lib/chordPlacement";
import { isChordOnlyLine } from "@/lib/chordProParser";
import {
  EMPTY_CHORD_INDICES,
  useLyricChordOffsets,
} from "@/lib/hooks/useLyricChordOffsets";
import { useLyricCaretScrub } from "@/lib/hooks/useLyricCaretScrub";
import { usePreferLyricScrub } from "@/lib/hooks/usePreferLyricScrub";
import {
  lyricChordStarts,
  lyricChordsSignature,
  normalizeLyricChords,
} from "@/lib/lyricChords";
import {
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
  graphemeLocale?: string;
  lyricScript?: string;
  /** Slot currently being placed on this line, if any. */
  activeSlot?: PlacementSlot | null;
  pendingChord?: string;
  /** When quick place is armed, shown in the scrub preview bubble. */
  quickPlaceChord?: string | null;
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
  graphemeLocale = "en",
  lyricScript = "latin",
  activeSlot,
  pendingChord = "",
  quickPlaceChord = null,
  onPlaceSlot,
  onChordClick,
}: LyricLineEditorProps) {
  const lyricRef = useRef<HTMLDivElement>(null);
  const onPlaceSlotRef = useRef(onPlaceSlot);
  const preferScrub = usePreferLyricScrub();
  const [keyboardCaret, setKeyboardCaret] = useState<number | null>(null);
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

  const handleScrubCommit = useCallback(
    (caretIndex: number) => {
      onPlaceSlotRef.current(
        slotFromCaret(line.lyrics, caretIndex, graphemeLocale),
      );
    },
    [line.lyrics, graphemeLocale],
  );

  const { scrubIndex, isScrubbing, scrubHandlers } = useLyricCaretScrub({
    lyrics: line.lyrics,
    enabled: preferScrub,
    onCommit: handleScrubCommit,
  });

  const previewCaretIndex =
    scrubIndex ?? keyboardCaret;

  const extraIndices = useMemo(() => {
    const indices = gapMeasurementIndices(line);
    if (activeSlot) {
      const caret = gapCaretIndex(line, activeSlot);
      indices.push(caret ?? slotPosition(activeSlot));
    }
    if (previewCaretIndex !== null) {
      indices.push(previewCaretIndex);
    }
    return indices.length > 0 ? indices : EMPTY_CHORD_INDICES;
  }, [line, activeSlot, previewCaretIndex]);

  const layoutKey =
    charStart !== undefined
      ? `${charStart}-${charEnd ?? charStart}`
      : previewCaretIndex !== null
        ? `scrub-${previewCaretIndex}`
        : "";

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
    if (isScrubbing) {
      setKeyboardCaret(null);
    }
  }, [isScrubbing]);

  useEffect(() => {
    if (preferScrub) {
      return;
    }

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

      const { start, end } = range;

      if (end <= start) {
        return;
      }

      if (line.lyrics.slice(start, end).trim() === "") {
        onPlaceSlotRef.current({ kind: "gap", index: start });
        return;
      }

      onPlaceSlotRef.current(
        slotFromSelection(line.lyrics, start, end, graphemeLocale),
      );
    };

    const scheduleNotify = () => {
      if (debounce) {
        clearTimeout(debounce);
      }
      debounce = setTimeout(notifySelection, 0);
    };

    const placeAtCaret = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        return;
      }

      const offset = getFocusOffsetInElement(element);
      if (offset === null) {
        return;
      }

      onPlaceSlotRef.current(slotFromCaret(line.lyrics, offset, graphemeLocale));
    };

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
  }, [preferScrub, line.lyrics, graphemeLocale]);

  const handleLyricKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!preferScrub) {
        return;
      }

      const max = line.lyrics.length;
      const current = previewCaretIndex ?? 0;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setKeyboardCaret(Math.max(0, current - 1));
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setKeyboardCaret(Math.min(max, current + 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        handleScrubCommit(current);
        setKeyboardCaret(null);
        return;
      }
      if (event.key === "Escape") {
        setKeyboardCaret(null);
      }
    },
    [preferScrub, line.lyrics.length, previewCaretIndex, handleScrubCommit],
  );

  const activeGapLeft = useMemo(() => {
    if (previewCaretIndex !== null) {
      return chordOffsets[previewCaretIndex];
    }
    if (!activeSlot) {
      return undefined;
    }
    const anchor = gapCaretIndex(line, activeSlot);
    if (anchor === undefined) {
      return undefined;
    }
    return chordOffsets[anchor];
  }, [activeSlot, chordOffsets, line, previewCaretIndex]);

  const scrubPreviewLabel =
    pendingChord.trim() || quickPlaceChord?.trim() || "+";

  const showScrubPreview = isScrubbing || keyboardCaret !== null;

  const lyricRowClass = [
    "lyric-row lyric-editor-line lyric-line-measured whitespace-pre px-1 py-0.5",
    preferScrub
      ? "lyric-scrub-surface cursor-grab hover:bg-lf-bg-muted/40"
      : "cursor-text hover:bg-lf-bg-muted/40",
    isScrubbing ? "lyric-scrub-surface--active" : "",
  ]
    .filter(Boolean)
    .join(" ");

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

      <div className="relative min-h-12">
        <div
          ref={lyricRef}
          data-section-index={sectionIndex}
          data-line-index={lineIndex}
          data-lyric-script={lyricScript}
          className={lyricRowClass}
          tabIndex={preferScrub ? 0 : undefined}
          {...(preferScrub ? scrubHandlers : {})}
          onKeyDown={handleLyricKeyDown}
          role={preferScrub ? "slider" : undefined}
          aria-label={
            preferScrub
              ? `Place chord on line ${lineIndex + 1}: drag or use arrow keys, then Enter`
              : undefined
          }
          aria-valuemin={preferScrub ? 0 : undefined}
          aria-valuemax={preferScrub ? line.lyrics.length : undefined}
          aria-valuenow={
            preferScrub && previewCaretIndex !== null ? previewCaretIndex : undefined
          }
        >
          {charRange
            ? renderLyricsWithTarget(line.lyrics, charRange)
            : line.lyrics || (preferScrub ? "\u00a0" : "")}
        </div>

        <div className="lyric-gap-layer pointer-events-none absolute inset-0 min-h-12">
          {gapZones.map((zone) => {
            const left = chordOffsets[zone.index];
            if (left === undefined) {
              return null;
            }

            const right = chordOffsets[zone.endIndex] ?? left;
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
                tabIndex={0}
                aria-label={describeSlot(line, { kind: "gap", index: zone.index })}
                aria-pressed={isActive}
                className={`lyric-gap-zone${
                  preferScrub ? " lyric-gap-zone--touch-keyboard" : " pointer-events-auto"
                }${isActive ? " lyric-gap-zone--active" : ""}`}
                style={{ left: `${zoneLeft}px`, width: `${zoneWidth}px` }}
                onClick={() => onPlaceSlot({ kind: "gap", index: zone.index })}
              />
            );
          })}

          {activeGapLeft !== undefined ? (
            <span
              className={
                showScrubPreview ? "lyric-scrub-caret" : "lyric-gap-caret"
              }
              style={{ left: `${activeGapLeft}px` }}
              aria-hidden
            />
          ) : null}

          {showScrubPreview && activeGapLeft !== undefined ? (
            <span
              className="lyric-scrub-preview"
              style={{ left: `${activeGapLeft}px` }}
              aria-hidden
            >
              {scrubPreviewLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
