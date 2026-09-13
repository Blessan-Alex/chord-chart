"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InteractiveEditor } from "@/components/InteractiveEditor";
import { SignInRequired } from "@/components/SignInRequired";
import { ALL_KEYS, type Key } from "@/lib/engine";
import {
  createDraft,
  discardDraft,
  DraftVersionConflictError,
  getDraftForSong,
  publishDraft,
  updateDraft,
} from "@/lib/firestore/songEdits";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Section, SongEdit } from "@/lib/types";

function isKey(value: string): value is Key {
  return (ALL_KEYS as readonly string[]).includes(value);
}

export default function SongEditPage() {
  const params = useParams();
  const router = useRouter();
  const songId = typeof params.id === "string" ? params.id : "";
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [draft, setDraft] = useState<SongEdit | null>(null);
  const [title, setTitle] = useState("");
  const [originalKey, setOriginalKey] = useState<Key>("C");
  const [notes, setNotes] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  const loadDraft = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let nextDraft = await getDraftForSong(songId);
      if (!nextDraft && user) {
        nextDraft = await createDraft(songId, user.uid);
      }
      if (!nextDraft) {
        setDraft(null);
        return;
      }
      setDraft(nextDraft);
      setTitle(nextDraft.title);
      setOriginalKey(nextDraft.originalKey);
      setNotes(nextDraft.notes ?? "");
      setSections(nextDraft.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load draft.");
    } finally {
      setLoading(false);
    }
  }, [songId, user]);

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      void loadDraft();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, isAdmin, loadDraft]);

  const saveDraft = async (nextSections: Section[]) => {
    if (!draft) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updateDraft(draft.id, {
        title: title.trim(),
        originalKey,
        sections: nextSections,
        notes: notes.trim() || null,
      });
      const refreshed = await getDraftForSong(songId);
      setDraft(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!draft) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updateDraft(draft.id, {
        title: title.trim(),
        originalKey,
        sections,
        notes: notes.trim() || null,
      });
      await publishDraft(draft.id, user!.uid);
      router.push(`/song/${songId}`);
    } catch (err) {
      if (err instanceof DraftVersionConflictError) {
        setError(
          "Someone else published changes while you were editing. Reload and try again.",
        );
      } else {
        setError(err instanceof Error ? err.message : "Could not publish.");
      }
      setBusy(false);
    }
  };

  const handleDiscard = async () => {
    if (!draft) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await discardDraft(draft.id);
      router.push(`/song/${songId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not discard draft.");
      setBusy(false);
      setShowDiscard(false);
    }
  };

  if (!authLoading && user && !isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4 sm:p-8">
        <h1 className="text-2xl font-semibold">Admin only</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Only admins can edit songs.
        </p>
        <Link href={`/song/${songId}`} className="text-sm text-neutral-500 hover:underline">
          ← Back to song
        </Link>
      </main>
    );
  }

  return (
    <SignInRequired>
      <ConfirmDialog
        open={showDiscard}
        title="Discard draft?"
        message="Unsaved changes in this draft will be lost."
        confirmLabel="Discard"
        onConfirm={() => {
          void handleDiscard();
        }}
        onCancel={() => setShowDiscard(false)}
      />

      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
        <Link
          href={`/song/${songId}`}
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          ← Back to song
        </Link>

        <div>
          <h1 className="text-2xl font-semibold">Edit song</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Draft changes are saved before publishing.
          </p>
        </div>

        {loading && <p className="text-neutral-400">Loading draft…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {!loading && draft && (
          <>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Original key</span>
                <select
                  value={originalKey}
                  onChange={(e) => {
                    if (isKey(e.target.value)) {
                      setOriginalKey(e.target.value);
                    }
                  }}
                  className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
                >
                  {ALL_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
                />
              </label>
            </div>

            <InteractiveEditor
              sections={sections}
              originalKey={originalKey}
              onSectionsChange={setSections}
              onSave={(nextSections) => {
                void saveDraft(nextSections);
              }}
            />

            <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void saveDraft(sections);
                }}
                className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void handlePublish();
                }}
                className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
              >
                Publish
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowDiscard(true)}
                className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-600 dark:border-red-900 dark:text-red-400"
              >
                Discard
              </button>
            </div>
          </>
        )}

        {!loading && !draft && (
          <p className="text-neutral-600 dark:text-neutral-400">
            Could not open a draft for this song.
          </p>
        )}
      </main>
    </SignInRequired>
  );
}
