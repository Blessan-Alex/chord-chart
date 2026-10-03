"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChordInputPopover } from "@/components/ChordInputPopover";
import { ChordProSourcePanel } from "@/components/ChordProSourcePanel";
import { InlineChordToolbar } from "@/components/InlineChordToolbar";
import { LyricLineEditor } from "@/components/LyricLineEditor";
import { PlacementToolbar } from "@/components/PlacementToolbar";
import { normalizeChordMark } from "@/lib/chordMarks";
import {
  applyPlacement,
  chordsUsedIn,
  describeSlot,
  findChordAtSlot,
  nextSlot,
  prepareGapPlacement,
  prevSlot,
  removePlacementAt,
  rewindPreparedGapSpacer,
  slotFromCaret,
  slotFromSelection,
  type PlacementSlot,
} from "@/lib/chordPlacement";
import {
  sectionsSignature,
  syncSourceTextFromSections,
  tryFlushChordSource,
} from "@/lib/chordSourceSync";
import { countChordsInSections } from "@/lib/chordProParser";
import {
  EDITOR_TAB_SOURCE,
  EDITOR_TAB_VISUAL,
  EDITOR_VISUAL_HEADING,
  EDITOR_VISUAL_HINT,
  EDITOR_VISUAL_HINT_TOUCH,
} from "@/lib/editorLabels";
import { getDiatonicChords, isValidChord, type Key } from "@/lib/engine";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTouchEditor } from "@/lib/hooks/useTouchEditor";
import {
  getFocusOffsetInElement,
  getSelectionRangeInElement,
} from "@/lib/hooks/useTextSelection";
import type { ChordMark, LyricLine, Section } from "@/lib/types";

type EditorMode = "visual" | "source";

const MAX_HISTORY = 40;

type ActivePlacement = {
  sIndex: number;
  lIndex: number;
  slot: PlacementSlot;
  currentVal: string;
};

type InteractiveEditorProps = {
  sections: Section[];
  onSave?: (sections: Section[]) => void;
  onSectionsChange?: (sections: Section[]) => void;
  originalKey: Key;
  /** Stacked: visual fine-tuner only (source panel lives in parent). */
  layout?: "tabs" | "stacked";
};

function insertLineAfter(
  sections: Section[],
  sIndex: number,
  afterLIndex: number,
  line: LyricLine,
): Section[] {
  return sections.map((section, si) =>
    si === sIndex
      ? {
          ...section,
          lines: [
            ...section.lines.slice(0, afterLIndex + 1),
            line,
            ...section.lines.slice(afterLIndex + 1),
          ],
        }
      : section,
  );
}

function replaceLine(
  sections: Section[],
  sIndex: number,
  lIndex: number,
  line: LyricLine,
): Section[] {
  return sections.map((section, si) =>
    si === sIndex
      ? {
          ...section,
          lines: section.lines.map((existing, li) =>
            li === lIndex ? line : existing,
          ),
        }
      : section,
  );
}

/** Remap a chord mark when preview spacer(s) before it are removed. */
function slotAfterPreviewSpacerRewind(
  mark: ChordMark,
  spacerIndex: number,
  count: number,
): { start: number; end: number } {
  const normalized = normalizeChordMark(mark);
  const lastRemoved = spacerIndex + count - 1;
  if (normalized.start <= lastRemoved) {
    return { start: normalized.start, end: normalized.end };
  }
  return {
    start: normalized.start - count,
    end: normalized.end - count,
  };
}

function lyricElementIndices(
  element: HTMLElement,
): { sIndex: number; lIndex: number } | null {
  const sIndex = Number(element.dataset.sectionIndex);
  const lIndex = Number(element.dataset.lineIndex);
  if (!Number.isInteger(sIndex) || !Number.isInteger(lIndex)) {
    return null;
  }
  return { sIndex, lIndex };
}

export function InteractiveEditor({
  sections: initialSections,
  onSave,
  onSectionsChange,
  originalKey,
  layout = "tabs",
}: InteractiveEditorProps) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const isStacked = layout === "stacked";
  const initialSectionsSig = useMemo(
    () => sectionsSignature(initialSections),
    [initialSections],
  );
  const [active, setActive] = useState<ActivePlacement | null>(null);
  const [chordError, setChordError] = useState<string | null>(null);
  const [history, setHistory] = useState<Section[][]>([]);
  const [lastChord, setLastChord] = useState<string | null>(null);
  const [quickChord, setQuickChord] = useState<string | null>(null);
  const [tabSourceText, setTabSourceText] = useState(() =>
    syncSourceTextFromSections(initialSections),
  );
  const [tabSourceError, setTabSourceError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const touchEditor = useTouchEditor();
  /** Spacer inserted when opening a full gap; removed on cancel if still empty. */
  const pendingGapSpacer = useRef<{
    sIndex: number;
    lIndex: number;
    /** Spacer char index inserted for preview. */
    index: number;
    /** How many spacers to rewind at `index`. */
    count: number;
    /** Original gap click index (for slot navigation after rewind). */
    gapIndex: number;
  } | null>(null);

  /** Signature we last handed upward, so the parent echoing it back is not a reset. */
  const emittedSig = useRef(initialSectionsSig);

  const emit = useCallback(
    (
      next: Section[],
      { notifyParent = true }: { notifyParent?: boolean } = {},
    ) => {
      emittedSig.current = sectionsSignature(next);
      setSections(next);
      if (notifyParent) {
        onSectionsChange?.(next);
      }
    },
    [onSectionsChange],
  );

  const commitSections = useCallback(
    (
      next: Section[],
      {
        record = true,
        recordFrom,
      }: { record?: boolean; recordFrom?: Section[] } = {},
    ) => {
      if (record) {
        setHistory((prev) => [...prev, recordFrom ?? sections].slice(-MAX_HISTORY));
      }
      emit(next);
    },
    [sections, emit],
  );

  useEffect(() => {
    if (initialSectionsSig === emittedSig.current) {
      return;
    }

    emittedSig.current = initialSectionsSig;
    pendingGapSpacer.current = null;
    setSections(initialSections);
    setHistory([]);
    setActive(null);
    if (!isStacked) {
      setTabSourceText(syncSourceTextFromSections(initialSections));
    }
  }, [initialSectionsSig, initialSections, isStacked]);

  const chordStats = useMemo(() => {
    const lineCount = sections.reduce((n, section) => n + section.lines.length, 0);
    const chordedLines = sections.reduce(
      (n, section) => n + section.lines.filter((line) => line.chords.length > 0).length,
      0,
    );
    return {
      lineCount,
      chordCount: countChordsInSections(sections),
      chordedLines,
    };
  }, [sections]);

  const allLines = useMemo(
    () => sections.flatMap((section) => section.lines),
    [sections],
  );
  const recents = useMemo(() => chordsUsedIn(allLines), [allLines]);

  const activeLine = active
    ? (sections[active.sIndex]?.lines[active.lIndex] ?? null)
    : null;

  const targetLabel = useMemo(() => {
    if (!active || !activeLine) {
      return null;
    }
    return describeSlot(activeLine, active.slot);
  }, [active, activeLine]);

  const existingChordAtSlot =
    active && activeLine ? findChordAtSlot(activeLine, active.slot) : undefined;

  const rewindPendingGapSpacerInto = useCallback((current: Section[]) => {
    const pending = pendingGapSpacer.current;
    if (!pending) {
      return { sections: current, changed: false };
    }

    const line = current[pending.sIndex]?.lines[pending.lIndex];
    pendingGapSpacer.current = null;
    if (!line) {
      return { sections: current, changed: false };
    }

    const rewound = rewindPreparedGapSpacer(line, pending.index, pending.count);
    if (rewound.lyrics === line.lyrics) {
      return { sections: current, changed: false };
    }

    return {
      sections: replaceLine(current, pending.sIndex, pending.lIndex, rewound),
      changed: true,
    };
  }, []);

  const persistSectionsWithoutGapPreview = useCallback(
    (current: Section[]): Section[] => {
      const { sections: next, changed } = rewindPendingGapSpacerInto(current);
      if (changed) {
        emit(next, { notifyParent: false });
      }
      return next;
    },
    [emit, rewindPendingGapSpacerInto],
  );

  useEffect(() => {
    return () => {
      pendingGapSpacer.current = null;
    };
  }, []);

  const clearPlacement = useCallback(() => {
    const { sections: next, changed } = rewindPendingGapSpacerInto(sections);
    if (changed) {
      emit(next, { notifyParent: false });
    }
    setChordError(null);
    setActive(null);
    window.getSelection()?.removeAllRanges();
  }, [sections, emit, rewindPendingGapSpacerInto]);

  /** Place a chord without opening the picker (quick place). */
  const stampChord = useCallback(
    (
      sIndex: number,
      lIndex: number,
      slot: PlacementSlot,
      chord: string,
      lineOverride?: LyricLine,
    ) => {
      const line = lineOverride ?? sections[sIndex]?.lines[lIndex];
      if (!line) {
        return;
      }

      const pending = pendingGapSpacer.current;
      let recordFrom: Section[] | undefined;
      if (
        pending &&
        pending.sIndex === sIndex &&
        pending.lIndex === lIndex &&
        lineOverride
      ) {
        const snapshotLine = sections[sIndex]?.lines[lIndex];
        if (snapshotLine) {
          const rewound = rewindPreparedGapSpacer(
            snapshotLine,
            pending.index,
            pending.count,
          );
          if (rewound.lyrics !== snapshotLine.lyrics) {
            recordFrom = replaceLine(sections, sIndex, lIndex, rewound);
          }
        }
      }

      const applied = applyPlacement(line, slot, chord);
      const base =
        lineOverride !== undefined
          ? replaceLine(sections, sIndex, lIndex, lineOverride)
          : sections;
      commitSections(replaceLine(base, sIndex, lIndex, applied.line), {
        recordFrom,
      });
      pendingGapSpacer.current = null;
      setLastChord(chord);
    },
    [sections, commitSections],
  );

  const openSlot = useCallback(
    (sIndex: number, lIndex: number, slot: PlacementSlot) => {
      const { sections: baseSections, changed: rewound } =
        rewindPendingGapSpacerInto(sections);
      if (rewound) {
        emit(baseSections, { notifyParent: false });
      }

      let line = baseSections[sIndex]?.lines[lIndex];
      if (!line) {
        return;
      }

      let resolvedSlot = slot;
      if (slot.kind === "gap") {
        const prepared = prepareGapPlacement(line, slot.index);
        line = prepared.line;
        resolvedSlot = prepared.slot;
        if (prepared.preparedSpacerAt !== null) {
          pendingGapSpacer.current = {
            sIndex,
            lIndex,
            index: prepared.preparedSpacerAt,
            count: prepared.preparedSpacerCount,
            gapIndex: slot.index,
          };
          emit(replaceLine(baseSections, sIndex, lIndex, line), {
            notifyParent: false,
          });
        }
      }

      if (quickChord) {
        stampChord(sIndex, lIndex, resolvedSlot, quickChord, line);
        return;
      }

      const existing = findChordAtSlot(line, resolvedSlot);
      setChordError(null);
      setActive({
        sIndex,
        lIndex,
        slot: resolvedSlot,
        currentVal: existing ? normalizeChordMark(existing).chord : "",
      });
    },
    [sections, quickChord, stampChord, emit, rewindPendingGapSpacerInto],
  );

  const removeChord = useCallback(() => {
    if (!active || active.slot.kind !== "char") {
      clearPlacement();
      return;
    }

    const line = sections[active.sIndex]?.lines[active.lIndex];
    if (!line) {
      clearPlacement();
      return;
    }

    commitSections(
      replaceLine(
        sections,
        active.sIndex,
        active.lIndex,
        removePlacementAt(line, active.slot.start),
      ),
    );
    clearPlacement();
  }, [active, sections, commitSections, clearPlacement]);

  const placeChord = useCallback(
    (rawValue?: string, advance = false) => {
      if (!active) {
        return;
      }

      const chord = (rawValue ?? active.currentVal).trim();
      if (!chord) {
        removeChord();
        return;
      }
      if (!isValidChord(chord)) {
        setChordError("Invalid chord. Try Am7, G/B, or Dsus4.");
        return;
      }

      const line = sections[active.sIndex]?.lines[active.lIndex];
      if (!line) {
        return;
      }

      const pending = pendingGapSpacer.current;
      let recordFrom: Section[] | undefined;
      if (
        pending &&
        pending.sIndex === active.sIndex &&
        pending.lIndex === active.lIndex
      ) {
        const rewound = rewindPreparedGapSpacer(line, pending.index, pending.count);
        if (rewound.lyrics !== line.lyrics) {
          recordFrom = replaceLine(
            sections,
            pending.sIndex,
            pending.lIndex,
            rewound,
          );
        }
      }

      const applied = applyPlacement(line, active.slot, chord);
      commitSections(
        replaceLine(sections, active.sIndex, active.lIndex, applied.line),
        { recordFrom },
      );
      setLastChord(chord);
      setChordError(null);
      pendingGapSpacer.current = null;

      if (advance) {
        setActive({
          ...active,
          slot: nextSlot(applied.line, applied.slot),
          currentVal: chord,
        });
        return;
      }

      clearPlacement();
    },
    [active, sections, commitSections, clearPlacement, removeChord],
  );

  const beginChordEdit = useCallback(
    (sIndex: number, lIndex: number, mark: ChordMark) => {
      const pendingBefore = pendingGapSpacer.current;
      const { sections: baseSections, changed } =
        rewindPendingGapSpacerInto(sections);
      if (changed) {
        emit(baseSections, { notifyParent: false });
      }

      const line = baseSections[sIndex]?.lines[lIndex];
      const normalized = normalizeChordMark(mark);
      let { start, end } = normalized;
      if (
        changed &&
        pendingBefore &&
        pendingBefore.sIndex === sIndex &&
        pendingBefore.lIndex === lIndex
      ) {
        ({ start, end } = slotAfterPreviewSpacerRewind(
          mark,
          pendingBefore.index,
          pendingBefore.count,
        ));
      }

      const onLine = line?.chords.find((candidate) => {
        const candidateMark = normalizeChordMark(candidate);
        return candidateMark.start === start && candidateMark.chord === normalized.chord;
      });
      if (onLine) {
        const candidateMark = normalizeChordMark(onLine);
        start = candidateMark.start;
        end = candidateMark.end;
      }

      setChordError(null);
      setActive({
        sIndex,
        lIndex,
        slot: { kind: "char", start, end },
        currentVal: normalized.chord,
      });
    },
    [sections, emit, rewindPendingGapSpacerInto],
  );

  const moveSlot = useCallback(
    (direction: 1 | -1) => {
      if (!active) {
        return;
      }

      const pendingBefore = pendingGapSpacer.current;
      const { sections: baseSections, changed } =
        rewindPendingGapSpacerInto(sections);
      if (changed) {
        emit(baseSections, { notifyParent: false });
      }

      const line = baseSections[active.sIndex]?.lines[active.lIndex];
      if (!line) {
        return;
      }

      let fromSlot = active.slot;
      if (
        changed &&
        pendingBefore &&
        pendingBefore.sIndex === active.sIndex &&
        pendingBefore.lIndex === active.lIndex
      ) {
        fromSlot = { kind: "gap", index: pendingBefore.gapIndex };
      }

      const slot =
        direction === 1 ? nextSlot(line, fromSlot) : prevSlot(line, fromSlot);
      setActive({ ...active, slot });
    },
    [active, sections, emit, rewindPendingGapSpacerInto],
  );

  const insertChordLine = useCallback(
    (sIndex: number, afterLIndex: number) => {
      const pendingBefore = pendingGapSpacer.current;
      const { sections: baseSections, changed } =
        rewindPendingGapSpacerInto(sections);
      if (changed) {
        emit(baseSections, { notifyParent: false });
      }
      commitSections(
        insertLineAfter(baseSections, sIndex, afterLIndex, {
          lyrics: "",
          chords: [],
        }),
        { recordFrom: baseSections },
      );
      setChordError(null);
      setActive((prev) => {
        if (!prev) {
          return null;
        }
        if (
          pendingBefore &&
          prev.sIndex === pendingBefore.sIndex &&
          prev.lIndex === pendingBefore.lIndex
        ) {
          return null;
        }
        if (prev.sIndex === sIndex && prev.lIndex > afterLIndex) {
          return { ...prev, lIndex: prev.lIndex + 1 };
        }
        return prev;
      });
    },
    [sections, commitSections, emit, rewindPendingGapSpacerInto],
  );

  const undo = useCallback(() => {
    if (history.length === 0) {
      return;
    }
    const previous = history[history.length - 1]!;
    setHistory(history.slice(0, -1));
    emit(previous);
    setActive(null);
    setChordError(null);
  }, [history, emit]);

  /** Open the picker from whatever the browser selection points at. */
  const openFromDomSelection = useCallback((): boolean => {
    const selection = window.getSelection();
    const node = selection?.focusNode;
    if (!node) {
      return false;
    }

    const host = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    const element = host?.closest<HTMLElement>(".lyric-editor-line");
    if (!element) {
      return false;
    }

    const indices = lyricElementIndices(element);
    if (!indices) {
      return false;
    }

    const line = sections[indices.sIndex]?.lines[indices.lIndex];
    if (!line) {
      return false;
    }

    const range = getSelectionRangeInElement(element, line.lyrics);
    if (range) {
      openSlot(
        indices.sIndex,
        indices.lIndex,
        slotFromSelection(line.lyrics, range.start, range.end),
      );
      return true;
    }

    const offset = getFocusOffsetInElement(element);
    if (offset === null) {
      return false;
    }

    openSlot(indices.sIndex, indices.lIndex, slotFromCaret(line.lyrics, offset));
    return true;
  }, [sections, openSlot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inField = Boolean(target?.closest("input, textarea, select"));

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !inField) {
        event.preventDefault();
        undo();
        return;
      }

      if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        if (!active) {
          return;
        }
        event.preventDefault();
        moveSlot(event.key === "ArrowRight" ? 1 : -1);
        return;
      }

      if (event.key === "Escape" && !active && quickChord) {
        setQuickChord(null);
        return;
      }

      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (inField || target?.closest("button")) {
        return;
      }

      if (openFromDomSelection()) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openFromDomSelection, undo, moveSlot, active, quickChord]);

  const palette = getDiatonicChords(originalKey);
  const showVisual = isStacked || editorMode === "visual";

  return (
    <div className="flex flex-col gap-4 pb-24 sm:pb-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isStacked ? (
            <div>
              <h3 className="text-sm font-semibold text-lf-text-primary">
                {EDITOR_VISUAL_HEADING}
              </h3>
              <p className="mt-0.5 text-sm text-lf-text-secondary">
                {touchEditor ? EDITOR_VISUAL_HINT_TOUCH : EDITOR_VISUAL_HINT}
              </p>
            </div>
          ) : (
            <div
              className="inline-flex rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-muted p-1"
              role="tablist"
              aria-label="Editor mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={editorMode === "source"}
                onClick={() => {
                  const persisted = persistSectionsWithoutGapPreview(sections);
                  setTabSourceText(syncSourceTextFromSections(persisted));
                  setTabSourceError(null);
                  clearPlacement();
                  setEditorMode("source");
                }}
                className={`min-h-10 rounded-[var(--lf-radius-sm)] px-4 text-sm font-medium transition-colors ${
                  editorMode === "source"
                    ? "bg-lf-bg-elevated text-lf-text-primary shadow-sm"
                    : "text-lf-text-secondary hover:text-lf-text-primary"
                }`}
              >
                {EDITOR_TAB_SOURCE}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={editorMode === "visual"}
                onClick={() => setEditorMode("visual")}
                className={`min-h-10 rounded-[var(--lf-radius-sm)] px-4 text-sm font-medium transition-colors ${
                  editorMode === "visual"
                    ? "bg-lf-bg-elevated text-lf-text-primary shadow-sm"
                    : "text-lf-text-secondary hover:text-lf-text-primary"
                }`}
              >
                {EDITOR_TAB_VISUAL}
              </button>
            </div>
          )}

        </div>

        {!isStacked && editorMode === "visual" && (
          <p className="text-sm text-lf-text-secondary">
            {touchEditor ? EDITOR_VISUAL_HINT_TOUCH : EDITOR_VISUAL_HINT}
          </p>
        )}

        {showVisual && (
          <PlacementToolbar
            chordCount={chordStats.chordCount}
            chordedLines={chordStats.chordedLines}
            lineCount={chordStats.lineCount}
            canUndo={history.length > 0}
            onUndo={undo}
            quickChord={quickChord}
            lastChord={lastChord}
            onToggleQuickChord={() =>
              setQuickChord((prev) => (prev ? null : lastChord))
            }
          />
        )}

        {onSave && !isMobile && editorMode === "visual" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onSave(persistSectionsWithoutGapPreview(sections))}
              className="shrink-0 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 py-2.5 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
            >
              Finish &amp; save
            </button>
          </div>
        )}
      </div>

      {!isStacked && editorMode === "source" ? (
        <ChordProSourcePanel
          sourceText={tabSourceText}
          onSourceTextChange={(text) => {
            setTabSourceText(text);
            setTabSourceError(null);
          }}
          applyError={tabSourceError}
          onApply={() => {
            const result = tryFlushChordSource(tabSourceText);
            if (!result.ok) {
              setTabSourceError(result.error);
              return;
            }
            commitSections(result.sections);
            setTabSourceError(null);
            setEditorMode("visual");
          }}
        />
      ) : null}

      {showVisual && (
        <div className="chord-chart chord-chart-editor rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4 shadow-sm">
          {sections.map((section, sIndex) => (
            <div key={`s-${sIndex}`} className="mb-6 last:mb-0">
              <div className="section-label">{`{${section.label}}`}</div>

              {section.lines.map((line, lIndex) => (
                <div key={`l-${lIndex}`} className="mb-1">
                  <LyricLineEditor
                    line={line}
                    originalKey={originalKey}
                    sectionIndex={sIndex}
                    lineIndex={lIndex}
                    activeSlot={
                      active?.sIndex === sIndex && active.lIndex === lIndex
                        ? active.slot
                        : null
                    }
                    pendingChord={
                      active?.sIndex === sIndex && active.lIndex === lIndex
                        ? active.currentVal
                        : ""
                    }
                    onPlaceSlot={(slot) => openSlot(sIndex, lIndex, slot)}
                    onChordClick={(mark) => beginChordEdit(sIndex, lIndex, mark)}
                  />
                  <button
                    type="button"
                    className="mb-3 min-h-10 w-full rounded-[var(--lf-radius-sm)] border border-dashed border-lf-border px-2 text-sm text-lf-text-secondary hover:bg-lf-bg-muted/50"
                    onClick={() => insertChordLine(sIndex, lIndex)}
                  >
                    + Chord line below
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {showVisual && touchEditor && active ? (
        <InlineChordToolbar
          palette={palette}
          recents={recents}
          value={active.currentVal}
          targetLabel={targetLabel}
          error={chordError}
          canRemove={Boolean(existingChordAtSlot)}
          reserveSaveBarSpace={Boolean(onSave)}
          onChange={(value) => {
            setChordError(null);
            setActive((prev) => (prev ? { ...prev, currentVal: value } : prev));
          }}
          onPick={(chord) => placeChord(chord)}
          onSubmit={() => placeChord()}
          onSubmitNext={() => placeChord(undefined, true)}
          onRemove={removeChord}
          onCancel={clearPlacement}
        />
      ) : showVisual ? (
        <ChordInputPopover
          open={active !== null}
          value={active?.currentVal ?? ""}
          targetLabel={targetLabel}
          error={chordError}
          palette={palette}
          recents={recents}
          mobile={false}
          canRemove={Boolean(existingChordAtSlot)}
          onChange={(value) => {
            setChordError(null);
            setActive((prev) => (prev ? { ...prev, currentVal: value } : prev));
          }}
          onSubmit={(value) => placeChord(value)}
          onSubmitNext={(value) => placeChord(value, true)}
          onRemove={removeChord}
          onCancel={clearPlacement}
        />
      ) : null}

      {onSave && isMobile && editorMode === "visual" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-lf-border bg-lf-bg-sidebar/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <button
            type="button"
            onClick={() => onSave(persistSectionsWithoutGapPreview(sections))}
            className="min-h-12 w-full rounded-[var(--lf-radius-md)] bg-lf-action-primary text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
          >
            Finish &amp; save
          </button>
        </div>
      )}
    </div>
  );
}
