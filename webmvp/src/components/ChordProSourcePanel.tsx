"use client";

import { useMemo, useState } from "react";

import {
  countChordsInSections,
  parseChordProSections,
  sectionsToChordProText,
} from "@/lib/chordProParser";
import { EDITOR_SOURCE_HEADING } from "@/lib/editorLabels";
import type { Section } from "@/lib/types";

type ChordProSourcePanelProps = {
  sections: Section[];
  onApply: (sections: Section[]) => void;
};

export function ChordProSourcePanel({
  sections,
  onApply,
}: ChordProSourcePanelProps) {
  const [sourceText, setSourceText] = useState(() =>
    sectionsToChordProText(sections),
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const preview = useMemo(() => {
    try {
      const parsed = parseChordProSections(sourceText);
      return {
        lineCount: parsed.reduce((n, s) => n + s.lines.length, 0),
        chordCount: countChordsInSections(parsed),
        error: null as string | null,
      };
    } catch (error) {
      return {
        lineCount: 0,
        chordCount: 0,
        error: error instanceof Error ? error.message : "Could not parse.",
      };
    }
  }, [sourceText]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-lf-text-primary">
          {EDITOR_SOURCE_HEADING}
        </h3>
        <p className="mt-1 text-sm text-lf-text-secondary">
          Paste lyrics with inline chords like{" "}
          <code className="rounded bg-lf-bg-muted px-1 font-mono text-xs">
            [Am]Amazing [G]grace
          </code>
          . Use{" "}
          <code className="rounded bg-lf-bg-muted px-1 font-mono text-xs">
            [Verse 1]
          </code>{" "}
          for sections. Apply to update the visual chart.
        </p>
      </div>

      <textarea
        value={sourceText}
        onChange={(event) => {
          setSourceText(event.target.value);
          setParseError(null);
        }}
        rows={14}
        spellCheck={false}
        className="min-h-[280px] w-full rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-page px-4 py-3 font-mono text-sm leading-relaxed text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
        placeholder={"[Verse 1]\n[Am]Amazing [G]grace how [C]sweet the sound"}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-lf-text-secondary">
          {preview.error ? (
            <span className="text-lf-danger">{preview.error}</span>
          ) : (
            <>
              Preview: {preview.lineCount} lines · {preview.chordCount} chords
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSourceText(sectionsToChordProText(sections))}
            className="min-h-10 rounded-[var(--lf-radius-md)] border border-lf-border px-4 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted"
          >
            Reset from chart
          </button>
          <button
            type="button"
            disabled={Boolean(preview.error) || preview.lineCount === 0}
            onClick={() => {
              try {
                const parsed = parseChordProSections(sourceText);
                onApply(parsed);
                setParseError(null);
              } catch (error) {
                setParseError(
                  error instanceof Error ? error.message : "Could not apply.",
                );
              }
            }}
            className="min-h-10 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-50"
          >
            Apply to chart
          </button>
        </div>
      </div>

      {parseError && (
        <p className="text-sm text-lf-danger" role="alert">
          {parseError}
        </p>
      )}
    </div>
  );
}
