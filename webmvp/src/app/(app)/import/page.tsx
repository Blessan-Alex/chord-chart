"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { InteractiveEditor } from "@/components/InteractiveEditor";
import { LanguageTagPicker } from "@/components/LanguageTagPicker";
import { parseRawLyrics } from "@/lib/editorParser";
import { EDITOR_EDIT_SUBTITLE } from "@/lib/editorLabels";
import { ALL_KEYS, type Key } from "@/lib/engine";
import { createSong } from "@/lib/firestore/songs";
import { useAuth } from "@/lib/hooks/useAuth";
import { saveSong } from "@/lib/storage";
import type { Section, Song } from "@/lib/types";

function isKey(value: string): value is Key {
  return (ALL_KEYS as readonly string[]).includes(value);
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`rounded-full px-2.5 py-0.5 font-medium ${
          step === 1
            ? "bg-lf-bg-active text-lf-brand"
            : "text-lf-text-tertiary"
        }`}
      >
        1 · Paste
      </span>
      <span className="text-lf-text-tertiary" aria-hidden>
        →
      </span>
      <span
        className={`rounded-full px-2.5 py-0.5 font-medium ${
          step === 2
            ? "bg-lf-bg-active text-lf-brand"
            : "text-lf-text-tertiary"
        }`}
      >
        2 · Chords
      </span>
    </div>
  );
}

export default function ImportPage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [originalKey, setOriginalKey] = useState<Key>("C");
  const [tags, setTags] = useState<string[]>([]);
  const [rawText, setRawText] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-4">
        <p className="text-lf-text-secondary">Loading…</p>
      </main>
    );
  }

  if (user && !isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4 sm:p-8">
        <h1 className="text-xl font-semibold text-lf-text-primary">
          Admin only
        </h1>
        <p className="text-sm text-lf-text-secondary">
          Only admins can add songs to the shared library. Sign out to save
          songs on this device instead.
        </p>
      </main>
    );
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rawText.trim()) {
      return;
    }

    setSections(parseRawLyrics(rawText));
    setStep(2);
  };

  const handleSave = async (finalSections: Section[]) => {
    setSaveError(null);

    try {
      if (user && isAdmin) {
        const created = await createSong(
          {
            title: title.trim(),
            originalKey,
            sections: finalSections,
            tags,
          },
          user.uid,
        );
        router.push(`/song/${created.id}`);
        return;
      }

      const song: Song = {
        id: "",
        title: title.trim(),
        originalKey,
        sections: finalSections,
      };

      const saved = saveSong(song);
      router.push(`/song/${saved.id}`);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save song.",
      );
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col p-4 pb-8 sm:p-8">
      <StepIndicator step={step} />

      {step === 1 && (
        <form onSubmit={handleNext} className="mt-6 flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-semibold text-lf-text-primary sm:text-2xl">
              Paste lyrics
            </h1>
            <p className="mt-1 text-sm text-lf-text-secondary">
              Put each section name on its own line, e.g.{" "}
              <span className="font-mono text-lf-text-primary">[Verse 1]</span>
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-sm font-medium text-lf-text-primary">
                Title
              </span>
              <input
                type="text"
                required
                className="min-h-12 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-4 text-base text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Good Good Father"
              />
            </label>

            <label className="w-28 shrink-0 sm:w-24">
              <span className="mb-1.5 block text-sm font-medium text-lf-text-primary">
                Key
              </span>
              <select
                className="min-h-12 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-3 text-base text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
                value={originalKey}
                onChange={(e) =>
                  isKey(e.target.value) && setOriginalKey(e.target.value)
                }
              >
                {ALL_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {user && isAdmin && (
            <LanguageTagPicker value={tags} onChange={setTags} />
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-lf-text-primary">
              Lyrics
            </span>
            <textarea
              required
              rows={14}
              className="w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-4 py-3 font-mono text-sm leading-relaxed text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                "[Verse 1]\nOh, I've heard a thousand stories\nOf what they think You're like..."
              }
            />
          </label>

          <button
            type="submit"
            disabled={!title.trim() || !rawText.trim()}
            className="min-h-12 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-5 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-40"
          >
            Next: place chords →
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="mt-6 flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-lf-text-primary sm:text-2xl">
              Place chords
            </h1>
            <p className="mt-1 truncate text-sm text-lf-text-secondary">
              {title} · {originalKey}
            </p>
            <p className="mt-1 text-sm text-lf-text-secondary">
              {EDITOR_EDIT_SUBTITLE}
            </p>
          </div>

          {saveError && (
            <p className="text-sm text-lf-danger" role="alert">
              {saveError}
            </p>
          )}

          <InteractiveEditor
            sections={sections}
            originalKey={originalKey}
            onSave={(finalSections) => {
              void handleSave(finalSections);
            }}
          />
        </div>
      )}
    </main>
  );
}
