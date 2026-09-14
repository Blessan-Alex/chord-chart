"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChordInputPopover } from "@/components/ChordInputPopover";
import { ChordProSourcePanel } from "@/components/ChordProSourcePanel";
import { InlineChordToolbar } from "@/components/InlineChordToolbar";
import { LyricLineEditor } from "@/components/LyricLineEditor";
import {
  createChordMark,
  getMarkStart,
  normalizeChordMark,
} from "@/lib/chordMarks";
import { countChordsInSections } from "@/lib/chordProParser";
import { getDiatonicChords, isValidChord, type Key } from "@/lib/engine";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTouchEditor } from "@/lib/hooks/useTouchEditor";
import { getSelectionRangeInElement } from "@/lib/hooks/useTextSelection";
import type { ChordMark, Section } from "@/lib/types";

type EditorMode = "visual" | "source";

type ActiveSelection = {
  sIndex: number;
  lIndex: number;
  start: number;
  end: number;
  currentVal: string;
};

type InteractiveEditorProps = {
  sections: Section[];
  onSave?: (sections: Section[]) => void;
  onSectionsChange?: (sections: Section[]) => void;
  originalKey: Key;
};

function findChordAtStart(chords: ChordMark[], start: number): ChordMark | undefined {
  return chords.find((mark) => getMarkStart(normalizeChordMark(mark)) === start);
}

function formatTargetSnippet(line: string, start: number, end: number): string {
  if (!line || end <= start) {
    return "";
  }

  const selected = line.slice(start, end);
  const contextStart = Math.max(0, start - 6);
  const contextEnd = Math.min(line.length, end + 6);
  const prefix = contextStart > 0 ? "…" : "";
  const suffix = contextEnd < line.length ? "…" : "";

  return `${prefix}${line.slice(contextStart, contextEnd)}${suffix} → “${selected}”`;
}

export function InteractiveEditor({
  sections: initialSections,
  onSave,
  onSectionsChange,
  originalKey,
}: InteractiveEditorProps) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const [activeSelection, setActiveSelection] = useState<ActiveSelection | null>(
    null,
  );
  const [chordError, setChordError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const touchEditor = useTouchEditor();

  const updateSections = (next: Section[] | ((prev: Section[]) => Section[])) => {
    setSections((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      onSectionsChange?.(resolved);
      return resolved;
    });
  };

  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

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

  const targetText = useMemo(() => {
    if (!activeSelection) {
      return null;
    }
    const line = sections[activeSelection.sIndex]?.lines[activeSelection.lIndex];
    if (!line) {
      return null;
    }
    return formatTargetSnippet(
      line.lyrics,
      activeSelection.start,
      activeSelection.end,
    );
  }, [activeSelection, sections]);

  const openSelection = useCallback(
    (sIndex: number, lIndex: number, start: number, end: number) => {
      const line = sections[sIndex]?.lines[lIndex];
      const existing = line ? findChordAtStart(line.chords, start) : undefined;

      setChordError(null);
      setActiveSelection({
        sIndex,
        lIndex,
        start,
        end,
        currentVal: existing?.chord ?? "",
      });
    },
    [sections],
  );

  const clearPlacement = () => {
    setChordError(null);
    setActiveSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const commitChord = (rawValue?: string) => {
    if (!activeSelection) {
      return;
    }

    const chord = (rawValue ?? activeSelection.currentVal).trim();
    if (chord && !isValidChord(chord)) {
      setChordError("Invalid chord. Try Am7, G/B, or Dsus4.");
      return;
    }
    setChordError(null);

    const { sIndex, lIndex, start, end } = activeSelection;

    updateSections((prev) => {
      const next = [...prev];
      const section = { ...next[sIndex], lines: [...next[sIndex].lines] };
      const line = {
        ...section.lines[lIndex],
        chords: [...section.lines[lIndex].chords],
      };
      const chords = line.chords.map(normalizeChordMark);
      const existingIdx = chords.findIndex((mark) => getMarkStart(mark) === start);

      if (!chord) {
        if (existingIdx >= 0) {
          chords.splice(existingIdx, 1);
        }
      } else if (existingIdx >= 0) {
        chords[existingIdx] = createChordMark(chord, start, end);
      } else {
        chords.push(createChordMark(chord, start, end));
      }

      line.chords = chords;
      section.lines[lIndex] = line;
      next[sIndex] = section;
      return next;
    });

    clearPlacement();
  };

  const removeChord = () => {
    if (!activeSelection) {
      return;
    }

    const { sIndex, lIndex, start } = activeSelection;

    updateSections((prev) => {
      const next = [...prev];
      const section = { ...next[sIndex], lines: [...next[sIndex].lines] };
      const line = {
        ...section.lines[lIndex],
        chords: section.lines[lIndex].chords.filter(
          (mark) => getMarkStart(normalizeChordMark(mark)) !== start,
        ),
      };
      section.lines[lIndex] = line;
      next[sIndex] = section;
      return next;
    });

    clearPlacement();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button")) {
        return;
      }

      const lyricLines = document.querySelectorAll<HTMLElement>(".lyric-editor-line");
      for (const element of lyricLines) {
        const range = getSelectionRangeInElement(element);
        if (!range) {
          continue;
        }

        const sIndex = Number(element.dataset.sectionIndex);
        const lIndex = Number(element.dataset.lineIndex);
        if (Number.isNaN(sIndex) || Number.isNaN(lIndex)) {
          continue;
        }

        event.preventDefault();
        openSelection(sIndex, lIndex, range.start, range.end);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSelection]);

  const palette = getDiatonicChords(originalKey);

  return (
    <div className="flex flex-col gap-4 pb-24 sm:pb-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-muted p-1"
            role="tablist"
            aria-label="Editor mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={editorMode === "source"}
              onClick={() => setEditorMode("source")}
              className={`min-h-10 rounded-[var(--lf-radius-sm)] px-4 text-sm font-medium transition-colors ${
                editorMode === "source"
                  ? "bg-lf-bg-elevated text-lf-text-primary shadow-sm"
                  : "text-lf-text-secondary hover:text-lf-text-primary"
              }`}
            >
              ChordPro source
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
              Visual fine-tune
            </button>
          </div>

          <p className="text-sm tabular-nums text-lf-text-secondary">
            {chordStats.chordCount} chords · {chordStats.chordedLines}/
            {chordStats.lineCount} lines chorded
          </p>
        </div>

        {editorMode === "visual" && (
          <p className="text-sm text-lf-text-secondary">
            {touchEditor ? (
              <>
                Highlight lyrics — the chord picker opens at the bottom when you
                finish selecting. Wide selections snap to one word.
              </>
            ) : (
              <>
                Select lyrics, then pick a chord. Press{" "}
                <kbd className="rounded bg-lf-bg-muted px-1.5 py-0.5 font-mono text-xs text-lf-text-primary">
                  /
                </kbd>{" "}
                with text selected.
              </>
            )}
          </p>
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

      {editorMode === "source" ? (
        <ChordProSourcePanel
          sections={sections}
          onApply={(next) => {
            updateSections(next);
            setEditorMode("visual");
          }}
        />
      ) : (
        <div className="chord-chart chord-chart-editor rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4 shadow-sm">
          {sections.map((section, sIndex) => (
            <div key={`s-${sIndex}`} className="mb-6 last:mb-0">
              <div className="section-label">[{section.label}]</div>

              {section.lines.map((line, lIndex) => (
                <LyricLineEditor
                  key={`l-${lIndex}`}
                  line={line}
                  originalKey={originalKey}
                  sectionIndex={sIndex}
                  lineIndex={lIndex}
                  selectionRange={
                    activeSelection?.sIndex === sIndex &&
                    activeSelection.lIndex === lIndex
                      ? {
                          start: activeSelection.start,
                          end: activeSelection.end,
                        }
                      : null
                  }
                  onSelection={({ start, end }) => {
                    openSelection(sIndex, lIndex, start, end);
                  }}
                  onChordClick={(mark) => {
                    const normalized = normalizeChordMark(mark);
                    setChordError(null);
                    setActiveSelection({
                      sIndex,
                      lIndex,
                      start: normalized.start,
                      end: normalized.end,
                      currentVal: normalized.chord,
                    });
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {editorMode === "visual" && touchEditor && activeSelection ? (
        <InlineChordToolbar
          palette={palette}
          value={activeSelection.currentVal}
          targetText={targetText}
          error={chordError}
          reserveSaveBarSpace={Boolean(onSave)}
          onChange={(value) => {
            setChordError(null);
            setActiveSelection((prev) =>
              prev ? { ...prev, currentVal: value } : prev,
            );
          }}
          onPick={(chord) => commitChord(chord)}
          onSubmit={() => commitChord()}
          onRemove={removeChord}
          onCancel={clearPlacement}
        />
      ) : editorMode === "visual" ? (
        <ChordInputPopover
          open={activeSelection !== null}
          value={activeSelection?.currentVal ?? ""}
          targetText={targetText}
          error={chordError}
          palette={palette}
          mobile={false}
          onChange={(value) => {
            setChordError(null);
            setActiveSelection((prev) =>
              prev ? { ...prev, currentVal: value } : prev,
            );
          }}
          onSubmit={(value) => commitChord(value)}
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
