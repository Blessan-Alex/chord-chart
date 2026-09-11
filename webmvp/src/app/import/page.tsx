"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { InteractiveEditor } from "@/components/InteractiveEditor";
import { parseRawLyrics } from "@/lib/editorParser";
import { ALL_KEYS, type Key } from "@/lib/engine";
import { saveSong } from "@/lib/storage";
import type { Section, Song } from "@/lib/types";

function isKey(value: string): value is Key {
  return (ALL_KEYS as readonly string[]).includes(value);
}

export default function ImportPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [originalKey, setOriginalKey] = useState<Key>("C");
  const [rawText, setRawText] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rawText.trim()) return;
    
    const parsed = parseRawLyrics(rawText);
    setSections(parsed);
    setStep(2);
  };

  const handleSave = (finalSections: Section[]) => {
    setSaveError(null);

    const song: Song = {
      id: "",
      title: title.trim(),
      originalKey,
      sections: finalSections,
    };

    try {
      const saved = saveSong(song);
      router.push(`/song/${saved.id}`);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save song.",
      );
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col p-4 sm:p-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        ← Home
      </Link>

      {step === 1 && (
        <form onSubmit={handleNext} className="flex flex-col gap-6">
          <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
            <h1 className="text-2xl font-semibold">Step 1: Paste Lyrics</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Paste your raw lyrics here. Type <strong>[Verse 1]</strong> on an empty line to separate sections.
            </p>
          </div>

          <div className="flex gap-4">
            <label className="flex-1">
              <span className="mb-1 block text-sm font-medium">Song Title</span>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Good Good Father"
              />
            </label>

            <label className="w-24 shrink-0">
              <span className="mb-1 block text-sm font-medium">Key</span>
              <select
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
                value={originalKey}
                onChange={(e) => isKey(e.target.value) && setOriginalKey(e.target.value)}
              >
                {ALL_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Lyrics</span>
            <textarea
              required
              rows={12}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"[Verse 1]\nOh, I've heard a thousand stories\nOf what they think You're like..."}
            />
          </label>

          <button
            type="submit"
            disabled={!title.trim() || !rawText.trim()}
            className="rounded bg-black px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Next: Place Chords →
          </button>
        </form>
      )}

      {step === 2 && (
        <>
          {saveError && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">
              {saveError}
            </p>
          )}
          <InteractiveEditor
            sections={sections}
            originalKey={originalKey}
            onSave={handleSave}
          />
        </>
      )}
    </main>
  );
}
