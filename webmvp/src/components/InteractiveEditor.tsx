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
  prevSlot,
  removePlacementAt,
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
import type { LyricLine, Section } from "@/lib/types";

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

  /** Signature we last handed upward, so the parent echoing it back is not a reset. */
  const emittedSig = useRef(initialSectionsSig);

  const emit = useCallback(
    (next: Section[]) => {
      emittedSig.current = sectionsSignature(next);
      setSections(next);
      onSectionsChange?.(next);
    },
    [onSectionsChange],
  );

  const commitSections = useCallback(
    (next: Section[], { record = true }: { record?: boolean } = {}) => {
      if (record) {
        setHistory((prev) => [...prev, sections].slice(-MAX_HISTORY));
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

  const clearPlacement = useCallback(() => {
    setChordError(null);
    setActive(null);
    window.getSelection()?.removeAllRanges();
  }, []);


  /** Place a chord without opening the picker (quick place). */
  const stampChord = useCallback(
    (sIndex: number, lIndex: number, slot: PlacementSlot, chord: string) => {
      const line = sections[sIndex]?.lines[lIndex];
      if (!line) {
        return;
      }
      const applied = applyPlacement(line, slot, chord);
      commitSections(replaceLine(sections, sIndex, lIndex, applied.line));
      setLastChord(chord);
    },
    [sections, commitSections],
  );

  const openSlot = useCallback(
    (sIndex: number, lIndex: number, slot: PlacementSlot) => {
      const line = sections[sIndex]?.lines[lIndex];
      if (!line) {
        return;
      }

      if (quickChord) {
        stampChord(sIndex, lIndex, slot, quickChord);
        return;
      }

      const existing = findChordAtSlot(line, slot);
      setChordError(null);
      setActive({
        sIndex,
        lIndex,
        slot,
        currentVal: existing ? normalizeChordMark(existing).chord : "",
      });
    },
    [sections, quickChord, stampChord],
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

      const applied = applyPlacement(line, active.slot, chord);
      commitSections(
        replaceLine(sections, active.sIndex, active.lIndex, applied.line),
      );
      setLastChord(chord);
      setChordError(null);

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

  const moveSlot = useCallback(
    (direction: 1 | -1) => {
      if (!active) {
        return;
      }
      const line = sections[active.sIndex]?.lines[active.lIndex];
      if (!line) {
        return;
      }

      const slot =
        direction === 1 ? nextSlot(line, active.slot) : prevSlot(line, active.slot);
      setActive({ ...active, slot });
    },
    [active, sections],
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
                  setTabSourceText(syncSourceTextFromSections(sections));
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
              onClick={() => onSave(sections)}
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
                <LyricLineEditor
                  key={`l-${lIndex}`}
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
                  onChordClick={(mark) => {
                    const normalized = normalizeChordMark(mark);
                    setChordError(null);
                    setActive({
                      sIndex,
                      lIndex,
                      slot: {
                        kind: "char",
                        start: normalized.start,
                        end: normalized.end,
                      },
                      currentVal: normalized.chord,
                    });
                  }}
                />
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
            onClick={() => onSave(sections)}
            className="min-h-12 w-full rounded-[var(--lf-radius-md)] bg-lf-action-primary text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
          >
            Finish &amp; save
          </button>
        </div>
      )}
    </div>
  );
}
