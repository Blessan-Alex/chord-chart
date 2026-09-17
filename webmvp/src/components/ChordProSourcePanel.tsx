"use client";

import { useMemo } from "react";

import {
  countChordsInSections,
  parseChordProSections,
} from "@/lib/chordProParser";
import { EDITOR_SOURCE_HEADING, EDITOR_SOURCE_HINT } from "@/lib/editorLabels";

type ChordProSourcePanelProps = {
  sourceText: string;
  onSourceTextChange: (text: string) => void;
  onApply: () => void;
  applyError?: string | null;
  large?: boolean;
};

export function ChordProSourcePanel({
  sourceText,
  onSourceTextChange,
  onApply,
  applyError = null,
  large = false,
}: ChordProSourcePanelProps) {
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
        <p className="mt-1 text-sm text-lf-text-secondary">{EDITOR_SOURCE_HINT}</p>
      </div>

      <textarea
        value={sourceText}
        onChange={(event) => {
          onSourceTextChange(event.target.value);
        }}
        rows={large ? 20 : 14}
        spellCheck={false}
        className={
          large
            ? "min-h-[420px] w-full rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-page px-4 py-3 font-mono text-sm leading-relaxed text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
            : "min-h-[280px] w-full rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-page px-4 py-3 font-mono text-sm leading-relaxed text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
        }
        placeholder={`{Verse 1}\n[F#m]Nin mukham kaanman nadha en [E]Ashaya [D]\n[F#m]Nin ishttam cheyyvan ennum en [E]vancha [D]`}
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
        <button
          type="button"
          disabled={Boolean(preview.error) || preview.lineCount === 0}
          onClick={onApply}
          className="min-h-10 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-50"
        >
          Apply to chart
        </button>
      </div>

      {applyError && (
        <p className="text-sm text-lf-danger" role="alert">
          {applyError}
        </p>
      )}
    </div>
  );
}
