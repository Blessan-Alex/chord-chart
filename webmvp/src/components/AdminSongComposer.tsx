"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { ChordProSourcePanel } from "@/components/ChordProSourcePanel";
import { ComposerActionBar } from "@/components/ComposerActionBar";
import {
  InteractiveEditor,
  type InteractiveEditorHandle,
} from "@/components/InteractiveEditor";
import { canPersistComposer } from "@/lib/composerGates";
import { LanguageTagPicker } from "@/components/LanguageTagPicker";
import {
  EDITOR_CONTINUE_TO_PLACEMENT,
  EDITOR_STEP_PLACEMENT,
  EDITOR_STEP_SOURCE,
} from "@/lib/editorLabels";
import {
  sectionsSignature,
  syncSourceTextFromSections,
  tryFlushChordSource,
  type FlushResult,
} from "@/lib/chordSourceSync";
import { ALL_KEYS, type Key } from "@/lib/engine";
import type { Section } from "@/lib/types";

export type AdminSongComposerHandle = {
  /** Apply chord source when dirty; otherwise keep visual chart sections. */
  getSectionsForSave: () => FlushResult;
  /** Force-parse chord source (Apply button). */
  flushSourceToSections: () => FlushResult;
};

type ComposerStep = "source" | "placement";

type AdminSongComposerProps = {
  title: string;
  onTitleChange: (value: string) => void;
  artist: string;
  onArtistChange: (value: string) => void;
  originalKey: Key;
  onOriginalKeyChange: (key: Key) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  sections: Section[];
  onSectionsChange: (sections: Section[]) => void;
  showLanguageTags?: boolean;
  notes?: string;
  onNotesChange?: (value: string) => void;
  actionBar?: {
    onBackToLibrary: () => void;
    onSaveDraft?: () => void;
    onPublish?: () => void;
    busy?: boolean;
    saveStatus?: "idle" | "saving" | "saved";
    primaryLabel?: string;
  };
  /** Fired when title, source, or sections change (for autosave parents). */
  onComposerActivity?: () => void;
};

const cardClass =
  "rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-5 shadow-sm sm:p-6";

function ComposerStepIndicator({ step }: { step: ComposerStep }) {
  return (
    <div className="flex items-center gap-2 text-sm" aria-label="Progress">
      <span
        className={`rounded-full px-2.5 py-0.5 font-medium ${
          step === "source"
            ? "bg-lf-bg-active text-lf-brand"
            : "text-lf-text-tertiary"
        }`}
      >
        1 · {EDITOR_STEP_SOURCE}
      </span>
      <span className="text-lf-text-tertiary" aria-hidden>→</span>
      <span
        className={`rounded-full px-2.5 py-0.5 font-medium ${
          step === "placement"
            ? "bg-lf-bg-active text-lf-brand"
            : "text-lf-text-tertiary"
        }`}
      >
        2 · {EDITOR_STEP_PLACEMENT}
      </span>
    </div>
  );
}

export const AdminSongComposer = forwardRef<
  AdminSongComposerHandle,
  AdminSongComposerProps
>(function AdminSongComposer(
  {
    title,
    onTitleChange,
    artist,
    onArtistChange,
    originalKey,
    onOriginalKeyChange,
    tags,
    onTagsChange,
    sections,
    onSectionsChange,
    showLanguageTags = true,
    notes,
    onNotesChange,
    actionBar,
    onComposerActivity,
  },
  ref,
) {
  const placementEditorRef = useRef<InteractiveEditorHandle>(null);
  const [placementCanUndo, setPlacementCanUndo] = useState(false);
  const [composerStep, setComposerStep] = useState<ComposerStep>("source");
  const [sourceText, setSourceText] = useState(() =>
    syncSourceTextFromSections(sections),
  );
  const [sourceDirty, setSourceDirty] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const sectionsSig = sectionsSignature(sections);

  useEffect(() => {
    if (!sourceDirty) {
      setSourceText(syncSourceTextFromSections(sections));
    }
  }, [sectionsSig, sections, sourceDirty]);

  const onComposerActivityRef = useRef(onComposerActivity);
  onComposerActivityRef.current = onComposerActivity;

  useEffect(() => {
    onComposerActivityRef.current?.();
  }, [title, sourceText, sectionsSig]);

  const flushSourceToSections = (): FlushResult => {
    const result = tryFlushChordSource(sourceText);
    if (result.ok) {
      onSectionsChange(result.sections);
      setSourceDirty(false);
      setApplyError(null);
    }
    return result;
  };

  const getSectionsForSave = (): FlushResult => {
    if (!sourceDirty) {
      return { ok: true, sections };
    }
    return flushSourceToSections();
  };

  useImperativeHandle(ref, () => ({
    getSectionsForSave,
    flushSourceToSections,
  }));

  const handleContinueToPlacement = () => {
    if (!title.trim()) {
      setApplyError("Title is required.");
      return;
    }
    const result = flushSourceToSections();
    if (!result.ok) {
      setApplyError(result.error);
      return;
    }
    if (!canPersistComposer(title, result.sections)) {
      setApplyError("Add at least one lyric line.");
      return;
    }
    setComposerStep("placement");
  };

  const canContinue =
    title.trim() !== "" &&
    tryFlushChordSource(sourceText).ok;

  const handleActionBack = () => {
    if (composerStep === "placement") {
      setComposerStep("source");
      return;
    }
    actionBar?.onBackToLibrary();
  };

  const handleSectionsChange = (next: Section[]) => {
    onSectionsChange(next);
    if (!sourceDirty) {
      setSourceText(syncSourceTextFromSections(next));
    }
  };

  const songDetailsCard = (
    <section className={cardClass}>
      <h2 className="text-base font-semibold text-lf-text-primary">
        Song details
      </h2>
      <div className="mt-4 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-lf-text-primary">
              Title
            </span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="min-h-12 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-4 text-base text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-lf-text-primary">
              Artist
            </span>
            <input
              type="text"
              value={artist}
              onChange={(e) => onArtistChange(e.target.value)}
              placeholder="Optional"
              className="min-h-12 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-4 text-base text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
            />
          </label>
        </div>

        {showLanguageTags && (
          <LanguageTagPicker value={tags} onChange={onTagsChange} />
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-lf-text-primary">
            Original key
          </span>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {ALL_KEYS.map((key) => {
              const isSelected = key === originalKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onOriginalKeyChange(key)}
                  className={`min-h-11 rounded-[var(--lf-radius-md)] border px-2 text-sm font-semibold transition-colors ${
                    isSelected
                      ? "border-lf-brand bg-lf-bg-active text-lf-brand"
                      : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>

        {onNotesChange !== undefined && notes !== undefined && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-lf-text-primary">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
              className="rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-4 py-3 text-sm text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
            />
          </label>
        )}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-6">
      {actionBar ? (
        <ComposerActionBar
          onBack={handleActionBack}
          canUndo={composerStep === "placement" && placementCanUndo}
          onUndo={
            composerStep === "placement"
              ? () => placementEditorRef.current?.undo()
              : undefined
          }
          onSave={actionBar.onSaveDraft}
          saveDisabled={!canPersistComposer(title, sections)}
          saveStatus={actionBar.saveStatus}
          primaryLabel={actionBar.primaryLabel}
          onPrimary={actionBar.onPublish}
          primaryDisabled={!canPersistComposer(title, sections)}
          busy={actionBar.busy}
        />
      ) : null}

      <ComposerStepIndicator step={composerStep} />

      {composerStep === "source" ? (
        <>
          {songDetailsCard}
          <section className={cardClass}>
            <ChordProSourcePanel
              large
              sourceText={sourceText}
              onSourceTextChange={(text) => {
                setSourceText(text);
                setSourceDirty(true);
                setApplyError(null);
              }}
              applyError={applyError}
              applyButtonLabel={EDITOR_CONTINUE_TO_PLACEMENT}
              applyDisabled={!canContinue}
              onApply={handleContinueToPlacement}
            />
          </section>
        </>
      ) : (
        <section className={cardClass}>
          <InteractiveEditor
            ref={placementEditorRef}
            layout="stacked"
            compactChrome
            sections={sections}
            originalKey={originalKey}
            languageTags={tags}
            onSectionsChange={handleSectionsChange}
            onUndoAvailabilityChange={setPlacementCanUndo}
          />
        </section>
      )}
    </div>
  );
});
