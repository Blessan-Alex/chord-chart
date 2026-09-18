"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  AdminSongComposer,
  type AdminSongComposerHandle,
} from "@/components/AdminSongComposer";
import { SignInRequired } from "@/components/SignInRequired";
import { EDITOR_EDIT_SUBTITLE } from "@/lib/editorLabels";
import type { Key } from "@/lib/engine";
import { invalidateSongIndexCache } from "@/lib/firestore/songIndexCache";
import { createSong } from "@/lib/firestore/songs";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Section } from "@/lib/types";

const EMPTY_SECTIONS: Section[] = [{ label: "Verse 1", lines: [] }];

export default function ImportPage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();
  const composerRef = useRef<AdminSongComposerHandle>(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [originalKey, setOriginalKey] = useState<Key>("C");
  const [tags, setTags] = useState<string[]>([]);
  const [sections, setSections] = useState<Section[]>(EMPTY_SECTIONS);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-4">
        <p className="text-lf-text-secondary">Loading…</p>
      </main>
    );
  }

  if (user && !isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 p-4 sm:p-8">
        <h1 className="text-xl font-semibold text-lf-text-primary">
          Admin only
        </h1>
        <p className="text-sm text-lf-text-secondary">
          Only admins can add songs to the shared library.
        </p>
        <Link href="/" className="text-sm text-lf-brand hover:underline">
          ← Back to library
        </Link>
      </main>
    );
  }

  const handleCreate = async (finalSections: Section[]) => {
    if (!user || !isAdmin) {
      return;
    }

    setSaveError(null);
    setSaving(true);

    try {
      const created = await createSong(
        {
          title: title.trim(),
          artist: artist.trim(),
          originalKey,
          sections: finalSections,
          tags,
        },
        user.uid,
      );
      await invalidateSongIndexCache();
      router.push(`/song/${created.id}`);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save song.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SignInRequired>
      <main className="mx-auto flex w-full max-w-5xl flex-col p-4 pb-12 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-lf-text-primary sm:text-3xl">
            Add song
          </h1>
          <p className="mt-1 text-sm text-lf-text-secondary">
            {EDITOR_EDIT_SUBTITLE}
          </p>
        </div>

        {saveError && (
          <p className="mb-4 text-sm text-lf-danger" role="alert">
            {saveError}
          </p>
        )}

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
          showLanguageTags
          footer={
            <div className="flex justify-end border-t border-lf-border pt-4">
              <button
                type="button"
                disabled={!title.trim() || saving}
                onClick={() => {
                  const resolved = composerRef.current?.getSectionsForSave();
                  if (!resolved || !resolved.ok) {
                    setSaveError(
                      resolved && !resolved.ok
                        ? resolved.error
                        : "Could not read chart data.",
                    );
                    return;
                  }
                  void handleCreate(resolved.sections);
                }}
                className="min-h-12 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-6 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-40"
              >
                {saving ? "Saving…" : "Create song"}
              </button>
            </div>
          }
        />
      </main>
    </SignInRequired>
  );
}
