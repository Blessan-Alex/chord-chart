"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  AdminSongComposer,
  type AdminSongComposerHandle,
} from "@/components/AdminSongComposer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SignInRequired } from "@/components/SignInRequired";
import { normalizeSections } from "@/lib/chordMarks";
import { canPersistComposer } from "@/lib/composerGates";
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
import type { Section, SongEdit, SongStatus } from "@/lib/types";

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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [activityTick, setActivityTick] = useState(0);
  const [songStatus, setSongStatus] = useState<SongStatus>("active");

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
      setSongStatus(song?.status ?? "draft");
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

  const persistDraft = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!draft || !user) {
        return false;
      }

      const sectionsToSave = resolveSectionsForSave();
      if (!sectionsToSave || !canPersistComposer(title, sectionsToSave)) {
        return false;
      }

      if (!options.silent) {
        setBusy(true);
      } else {
        setSaveStatus("saving");
      }
      setError(null);

      try {
        await updateDraft(draft.id, {
          title: title.trim(),
          originalKey,
          sections: sectionsToSave,
          notes: notes.trim() || null,
        });

        try {
          if (songStatus === "draft") {
            await updateSong(songId, {
              artist: artist.trim(),
              tags,
              title: title.trim(),
              sections: sectionsToSave,
              originalKey,
            });
          } else {
            await updateSong(songId, {
              artist: artist.trim(),
              tags,
            });
          }
        } catch {
          // Song doc sync is best-effort while a songEdit draft is open.
        }

        await invalidateSongIndexCache();
        if (options.silent) {
          setSaveStatus("saved");
        }
        return true;
      } catch (err) {
        if (!options.silent) {
          setError(err instanceof Error ? err.message : "Could not save draft.");
        }
        setSaveStatus("idle");
        return false;
      } finally {
        if (!options.silent) {
          setBusy(false);
        }
      }
    },
    [draft, user, title, originalKey, notes, artist, tags, songId, songStatus],
  );

  useEffect(() => {
    if (!draft || loading) {
      return;
    }
    const timer = setTimeout(() => {
      void persistDraft({ silent: true });
    }, 1600);
    return () => clearTimeout(timer);
  }, [draft, loading, title, sections, originalKey, notes, artist, tags, activityTick, persistDraft]);

  const handlePublish = async () => {
    if (!draft || !user) {
      return;
    }

    const ok = await persistDraft();
    if (!ok) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const song = await getSong(songId);
      let draftToPublish = draft;
      if (song) {
        const reconciled = await reconcileDraftWithSong(draft.id, song.version);
        if (reconciled) {
          draftToPublish = reconciled;
          setDraft(reconciled);
        }
      }

      await publishDraft(draftToPublish.id, user.uid, {
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
        <p className="text-lf-text-secondary">Only admins can edit songs.</p>
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

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 pb-8 sm:p-6">
        <h1 className="text-2xl font-semibold text-lf-text-primary">Edit song</h1>

        {loading && <p className="text-lf-text-tertiary">Loading…</p>}
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
            onComposerActivity={() => setActivityTick((tick) => tick + 1)}
            actionBar={{
              onBackToLibrary: () => router.push(`/song/${songId}`),
              onSaveDraft: () => {
                void persistDraft().then((ok) => {
                  if (ok) {
                    setSaveNotice("Draft saved.");
                  }
                });
              },
              onPublish: () => {
                void handlePublish();
              },
              busy,
              saveStatus,
            }}
          />
        )}

        {!loading && draft && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowDiscard(true)}
            className="self-start text-sm font-medium text-lf-danger hover:underline disabled:opacity-50"
          >
            Discard draft
          </button>
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
