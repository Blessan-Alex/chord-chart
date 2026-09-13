"use client";

import { useEffect, useState } from "react";

import { ChordInputPopover } from "@/components/ChordInputPopover";
import { LyricLineEditor } from "@/components/LyricLineEditor";
import {
  createChordMark,
  getMarkStart,
  normalizeChordMark,
} from "@/lib/chordMarks";
import { getDiatonicChords, isValidChord, type Key } from "@/lib/engine";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { getSelectionRangeInElement } from "@/lib/hooks/useTextSelection";
import type { ChordMark, Section } from "@/lib/types";

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

export function InteractiveEditor({
  sections: initialSections,
  onSave,
  onSectionsChange,
  originalKey,
}: InteractiveEditorProps) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [activeSelection, setActiveSelection] = useState<ActiveSelection | null>(
    null,
  );
  const [chordError, setChordError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const updateSections = (next: Section[] | ((prev: Section[]) => Section[])) => {
    setSections((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      onSectionsChange?.(resolved);
      return resolved;
    });
  };

  const openSelection = (
    sIndex: number,
    lIndex: number,
    start: number,
    end: number,
  ) => {
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
  };

  const commitChord = (rawValue?: string) => {
    if (!activeSelection) {
      return;
    }

    const chord = (rawValue ?? activeSelection.currentVal).trim();
    if (chord && !isValidChord(chord)) {
      setChordError("Invalid chord. Use formats like Am7, G/B, or Dsus4.");
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

    setActiveSelection(null);
    window.getSelection()?.removeAllRanges();
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

    setActiveSelection(null);
    window.getSelection()?.removeAllRanges();
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
        const line = sections[sIndex]?.lines[lIndex];
        const existing = line
          ? findChordAtStart(line.chords, range.start)
          : undefined;
        setChordError(null);
        setActiveSelection({
          sIndex,
          lIndex,
          start: range.start,
          end: range.end,
          currentVal: existing?.chord ?? "",
        });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sections]);

  const palette = getDiatonicChords(originalKey);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-lf-text-secondary">
          Highlight lyrics to place a chord above the selection start. Press{" "}
          <kbd className="rounded bg-lf-bg-muted px-1.5 py-0.5 font-mono text-xs">
            /
          </kbd>{" "}
          to open chord input.
        </p>
        {onSave && (
          <button
            type="button"
            onClick={() => onSave(sections)}
            className="shrink-0 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 py-2 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
          >
            Finish &amp; Save
          </button>
        )}
      </div>

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
                activeStart={
                  activeSelection?.sIndex === sIndex &&
                  activeSelection.lIndex === lIndex
                    ? activeSelection.start
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

      <ChordInputPopover
        open={activeSelection !== null}
        value={activeSelection?.currentVal ?? ""}
        error={chordError}
        palette={palette}
        mobile={isMobile}
        onChange={(value) => {
          setChordError(null);
          setActiveSelection((prev) =>
            prev ? { ...prev, currentVal: value } : prev,
          );
        }}
        onSubmit={(value) => commitChord(value)}
        onRemove={removeChord}
        onCancel={() => {
          setChordError(null);
          setActiveSelection(null);
        }}
      />
    </div>
  );
}
