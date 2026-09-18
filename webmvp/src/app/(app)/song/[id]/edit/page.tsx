"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  AdminSongComposer,
  type AdminSongComposerHandle,
} from "@/components/AdminSongComposer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SignInRequired } from "@/components/SignInRequired";
import { normalizeSections } from "@/lib/chordMarks";
import { EDITOR_EDIT_SUBTITLE } from "@/lib/editorLabels";
import { type Key } from "@/lib/engine";
import {
  createDraft,
  discardDraft,
  DraftVersionConflictError,
  getDraftForSong,
  publishDraft,
  reconcileDraftWithSong,
  updateDraft,
} from "@/lib/firestore/songEdits";
import { invalidateSongIndexCache } from "@/lib/firestore/songIndexCache";
import { getSong, updateSong } from "@/lib/firestore/songs";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Section, SongEdit } from "@/lib/types";

function EditDraftActions({
  busy,
  onSaveDraft,
  onPublish,
}: {
  busy: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={onSaveDraft}
        className="rounded-[var(--lf-radius-md)] border border-lf-border px-4 py-2 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted disabled:opacity-50"
      >
        Save draft
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onPublish}
        className="rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 py-2 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-50"
      >
        Publish
      </button>
    </div>
  );
}

export default function SongEditPage() {
  const params = useParams();
  const router = useRouter();
  const songId = typeof params.id === "string" ? params.id : "";
  const { user, isAdmin, loading: authLoading } = useAuth();
  const composerRef = useRef<AdminSongComposerHandle>(null);

  const [draft, setDraft] = useState<SongEdit | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [originalKey, setOriginalKey] = useState<Key>("C");
  const [notes, setNotes] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  const loadDraft = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveNotice(null);
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

      if (song) {
        const reconciled = await reconcileDraftWithSong(
          nextDraft.id,
          song.version,
        );
        if (reconciled) {
          nextDraft = reconciled;
        }
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

  const resolveSectionsForSave = (): Section[] | null => {
    const resolved = composerRef.current?.getSectionsForSave();
    if (!resolved || !resolved.ok) {
      setError(
        resolved && !resolved.ok
          ? resolved.error
          : "Could not read chart data.",
      );
      return null;
    }
    setSections(resolved.sections);
    return resolved.sections;
  };

  const saveDraft = async () => {
    if (!draft) {
      return;
    }

    const sectionsToSave = resolveSectionsForSave();
    if (!sectionsToSave) {
      return;
    }

    setBusy(true);
    setError(null);
    setSaveNotice(null);
    try {
      await updateDraft(draft.id, {
        title: title.trim(),
        originalKey,
        sections: sectionsToSave,
        notes: notes.trim() || null,
      });

      let metaWarning: string | null = null;
      try {
        await updateSong(songId, {
          artist: artist.trim(),
          tags,
        });
      } catch (metaErr) {
        metaWarning =
          metaErr instanceof Error
            ? `Draft saved; metadata: ${metaErr.message}`
            : "Draft saved; artist/tags could not be updated.";
      }

      await invalidateSongIndexCache();
      if (metaWarning) {
        setSaveNotice(metaWarning);
        setBusy(false);
        return;
      }
      router.push(`/song/${songId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft.");
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!draft) {
      return;
    }

    const sectionsToSave = resolveSectionsForSave();
    if (!sectionsToSave) {
      return;
    }

    setBusy(true);
    setError(null);
    setSaveNotice(null);
    try {
      await updateDraft(draft.id, {
        title: title.trim(),
        originalKey,
        sections: sectionsToSave,
        notes: notes.trim() || null,
      });

      const song = await getSong(songId);
      let draftToPublish = draft;
      if (song) {
        const reconciled = await reconcileDraftWithSong(draft.id, song.version);
        if (reconciled) {
          draftToPublish = reconciled;
          setDraft(reconciled);
        }
      }

      await publishDraft(draftToPublish.id, user!.uid, {
        artist: artist.trim(),
        tags,
      });
      await invalidateSongIndexCache();
      router.push(`/song/${songId}`);
    } catch (err) {
      if (err instanceof DraftVersionConflictError) {
        setError(
          "The song changed while publishing. Reload this page and try again.",
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
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
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

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 pb-28 sm:p-6 sm:pb-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/song/${songId}`}
            className="text-sm text-lf-text-secondary hover:text-lf-text-primary"
          >
            ← Back
          </Link>
          {draft && (
            <EditDraftActions
              busy={busy}
              onSaveDraft={() => {
                void saveDraft();
              }}
              onPublish={() => {
                void handlePublish();
              }}
            />
          )}
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
        {saveNotice && (
          <p className="text-sm text-lf-brand" role="status">
            {saveNotice}
          </p>
        )}

        {!loading && draft && (
          <div className="flex flex-col gap-4">
            <AdminSongComposer
              ref={composerRef}
              title={title}
              onTitleChange={setTitle}
              artist={artist}
              onArtistChange={setArtist}
              originalKey={originalKey}
              onOriginalKeyChange={setOriginalKey}
              tags={tags}
              onTagsChange={setTags}
              sections={sections}
              onSectionsChange={setSections}
              notes={notes}
              onNotesChange={setNotes}
            />
          </div>
        )}

        {!loading && draft && (
          <div
            className="fixed inset-x-0 bottom-0 z-20 border-t border-lf-border bg-lf-bg-elevated/95 px-4 py-3 backdrop-blur sm:hidden"
          >
            <div className="mx-auto flex max-w-5xl flex-col gap-3">
              <EditDraftActions
                busy={busy}
                onSaveDraft={() => {
                  void saveDraft();
                }}
                onPublish={() => {
                  void handlePublish();
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowDiscard(true)}
                className="rounded-[var(--lf-radius-md)] border border-lf-danger/30 px-4 py-2 text-sm font-medium text-lf-danger hover:bg-lf-danger-bg disabled:opacity-50"
              >
                Discard draft
              </button>
            </div>
          </div>
        )}

        {!loading && draft && (
          <div className="hidden border-t border-lf-border pt-4 sm:block">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowDiscard(true)}
                className="rounded-[var(--lf-radius-md)] border border-lf-danger/30 px-4 py-2 text-sm font-medium text-lf-danger hover:bg-lf-danger-bg disabled:opacity-50"
              >
                Discard draft
              </button>
              <EditDraftActions
                busy={busy}
                onSaveDraft={() => {
                  void saveDraft();
                }}
                onPublish={() => {
                  void handlePublish();
                }}
              />
            </div>
          </div>
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
