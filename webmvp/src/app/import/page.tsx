"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { twinklePreset } from "@/data/presets";
import { chordToDegree, MAJOR_KEYS } from "@/lib/engine";
import { formatError } from "@/lib/formatError";
import { getSlotLabels } from "@/lib/lineLabels";
import { saveSong } from "@/lib/storage";
import type { Line, Song } from "@/lib/types";

function createEmptyLines(): Line[] {
  return twinklePreset.lines.map((line) => ({
    lyrics: line.lyrics,
    labels: line.labels,
    slots: line.slots.map(() => ({ chord: "" })),
  }));
}

function degreeKey(lineIndex: number, slotIndex: number): string {
  return `${lineIndex}-${slotIndex}`;
}

export default function ImportPage() {
  const router = useRouter();
  const [originalKey, setOriginalKey] = useState(twinklePreset.originalKey);
  const [lines, setLines] = useState<Line[]>(createEmptyLines);
  const [previewDegrees, setPreviewDegrees] = useState<Record<string, string>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);

  function updatePreviewDegree(
    lineIndex: number,
    slotIndex: number,
    chord: string,
    key: string,
  ) {
    const keyId = degreeKey(lineIndex, slotIndex);
    const trimmed = chord.trim();

    if (!trimmed) {
      setPreviewDegrees((current) => {
        const next = { ...current };
        delete next[keyId];
        return next;
      });
      return;
    }

    try {
      const degree = chordToDegree(trimmed, key);
      setPreviewDegrees((current) => ({ ...current, [keyId]: degree }));
    } catch {
      setPreviewDegrees((current) => {
        const next = { ...current };
        delete next[keyId];
        return next;
      });
    }
  }

  function handleChordChange(
    lineIndex: number,
    slotIndex: number,
    value: string,
  ) {
    setError(null);
    setLines((current) =>
      current.map((line, li) =>
        li === lineIndex
          ? {
              ...line,
              slots: line.slots.map((slot, si) =>
                si === slotIndex ? { ...slot, chord: value } : slot,
              ),
            }
          : line,
      ),
    );
  }

  function handleChordBlur(lineIndex: number, slotIndex: number) {
    const chord = lines[lineIndex]?.slots[slotIndex]?.chord ?? "";
    updatePreviewDegree(lineIndex, slotIndex, chord, originalKey);
  }

  function handleOriginalKeyChange(key: string) {
    setOriginalKey(key);
    setError(null);

    const nextPreview: Record<string, string> = {};

    lines.forEach((line, lineIndex) => {
      line.slots.forEach((slot, slotIndex) => {
        const trimmed = slot.chord.trim();
        if (!trimmed) {
          return;
        }

        try {
          nextPreview[degreeKey(lineIndex, slotIndex)] = chordToDegree(
            trimmed,
            key,
          );
        } catch {
          // Leave preview blank for invalid chords until save.
        }
      });
    });

    setPreviewDegrees(nextPreview);
  }

  function handleSave() {
    setError(null);

    try {
      const mappedLines: Line[] = lines.map((line) => ({
        ...line,
        slots: line.slots.map((slot) => {
          const chord = slot.chord.trim();
          if (!chord) {
            return { chord: "" };
          }

          return {
            chord,
            degree: chordToDegree(chord, originalKey),
            quality: "major",
          };
        }),
      }));

      const song: Song = {
        id: "",
        title: twinklePreset.title,
        originalKey,
        lines: mappedLines,
      };

      const savedSong = saveSong(song);
      router.push(`/song/${savedSong.id}`);
    } catch (saveError) {
      setError(formatError(saveError));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 pb-28 sm:p-8 sm:pb-8">
      <div>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          ← Home
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Import Song
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Preset</span>
          <select
            value={twinklePreset.title}
            disabled
            className="min-h-11 w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option>{twinklePreset.title}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">
            Original key
          </span>
          <select
            value={originalKey}
            onChange={(event) => handleOriginalKeyChange(event.target.value)}
            className="min-h-11 w-full rounded border border-neutral-300 px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-950"
          >
            {MAJOR_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-10">
        {lines.map((line, lineIndex) => {
          const labels = getSlotLabels(line);

          return (
            <section key={line.lyrics} className="flex flex-col gap-3">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {line.lyrics}
              </p>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {line.slots.map((slot, slotIndex) => {
                  const preview =
                    previewDegrees[degreeKey(lineIndex, slotIndex)];

                  return (
                    <label
                      key={`${lineIndex}-${slotIndex}`}
                      className="flex flex-col items-center gap-1 text-center text-sm"
                    >
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {labels[slotIndex]}
                      </span>
                      <input
                        type="text"
                        value={slot.chord}
                        onChange={(event) =>
                          handleChordChange(
                            lineIndex,
                            slotIndex,
                            event.target.value,
                          )
                        }
                        onBlur={() => handleChordBlur(lineIndex, slotIndex)}
                        placeholder="C"
                        className="min-h-11 w-full rounded border border-neutral-300 px-2 py-2 text-center text-base uppercase dark:border-neutral-700 dark:bg-neutral-950"
                      />
                      {preview ? (
                        <span className="font-mono text-xs text-neutral-500">
                          {preview}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-[var(--background)] p-4 sm:static sm:border-0 sm:p-0">
        <button
          type="button"
          onClick={handleSave}
          className="min-h-12 w-full rounded bg-neutral-900 px-4 py-3 text-base font-semibold text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          Save
        </button>
      </div>
    </main>
  );
}
