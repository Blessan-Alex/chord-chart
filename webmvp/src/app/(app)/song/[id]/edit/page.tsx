"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InteractiveEditor } from "@/components/InteractiveEditor";
import { LanguageTagPicker } from "@/components/LanguageTagPicker";
import { SignInRequired } from "@/components/SignInRequired";
import { normalizeSections } from "@/lib/chordMarks";
import { ALL_KEYS, type Key } from "@/lib/engine";
import { EDITOR_EDIT_SUBTITLE } from "@/lib/editorLabels";
import {
  createDraft,
  discardDraft,
  DraftVersionConflictError,
  getDraftForSong,
  publishDraft,
  updateDraft,
} from "@/lib/firestore/songEdits";
import { getSong, updateSong } from "@/lib/firestore/songs";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Section, SongEdit } from "@/lib/types";

export default function SongEditPage() {
  const params = useParams();
  const router = useRouter();
  const songId = typeof params.id === "string" ? params.id : "";
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [draft, setDraft] = useState<SongEdit | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [tags, setTags] = useState<string[]>([]);
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
      const [song, existingDraft] = await Promise.all([
        getSong(songId),
        getDraftForSong(songId),
      ]);

      let nextDraft = existingDraft;
      if (!nextDraft && user) {
        nextDraft = await createDraft(songId, user.uid);
      }
      if (!nextDraft) {
        setDraft(null);
        return;
      }

      setDraft(nextDraft);
      setTitle(nextDraft.title);
      setArtist(song?.artist ?? "");
      setTags(song?.tags ?? []);
      setOriginalKey(nextDraft.originalKey);
      setNotes(nextDraft.notes ?? "");
      setSections(normalizeSections(nextDraft.sections));
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

  const saveDraft = async () => {
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
      await updateSong(songId, {
        artist: artist.trim(),
        tags,
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
      await publishDraft(draft.id, user!.uid, {
        artist: artist.trim(),
        tags,
      });
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
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold text-lf-text-primary">Admin only</h1>
        <p className="text-lf-text-secondary">
          Only admins can edit songs.
        </p>
        <Link href={`/song/${songId}`} className="text-sm text-lf-brand hover:underline">
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

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-24 sm:p-6 sm:pb-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/song/${songId}`}
            className="text-sm text-lf-text-secondary hover:text-lf-text-primary"
          >
            ← Back
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void saveDraft();
              }}
              className="rounded-[var(--lf-radius-md)] border border-lf-border px-4 py-2 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void handlePublish();
              }}
              className="rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 py-2 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-50"
            >
              Publish
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-lf-text-primary">Edit song</h1>
          <p className="mt-1 text-sm text-lf-text-secondary">
            {EDITOR_EDIT_SUBTITLE}
          </p>
        </div>

        {loading && <p className="text-lf-text-tertiary">Loading draft…</p>}
        {error && (
          <p className="text-sm text-lf-danger" role="alert">
            {error}
          </p>
        )}

        {!loading && draft && (
          <>
            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-lf-text-primary">Title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-4 py-3 text-base text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-lf-text-primary">Artist</span>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Optional"
                  className="rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-4 py-3 text-base text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
                />
              </label>

              <LanguageTagPicker value={tags} onChange={setTags} />

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-lf-text-primary">
                  Original key
                </span>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {ALL_KEYS.map((key) => {
                    const isSelected = key === originalKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setOriginalKey(key)}
                        className={`min-h-12 rounded-[var(--lf-radius-md)] border px-2 text-sm font-semibold transition-colors ${
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

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-lf-text-primary">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-4 py-3 text-sm text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
                />
              </label>
            </div>

            <InteractiveEditor
              sections={sections}
              originalKey={originalKey}
              onSectionsChange={setSections}
            />

            <div className="flex flex-wrap gap-2 border-t border-lf-border pt-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowDiscard(true)}
                className="rounded-[var(--lf-radius-md)] border border-lf-danger/30 px-4 py-2 text-sm font-medium text-lf-danger hover:bg-lf-danger-bg disabled:opacity-50"
              >
                Discard draft
              </button>
            </div>
          </>
        )}

        {!loading && !draft && (
          <p className="text-lf-text-secondary">
            Could not open a draft for this song.
          </p>
        )}
      </main>
    </SignInRequired>
  );
}
