"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  AdminSongComposer,
  type AdminSongComposerHandle,
} from "@/components/AdminSongComposer";
import { SignInRequired } from "@/components/SignInRequired";
import { canPersistComposer } from "@/lib/composerGates";
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
  const [creating, setCreating] = useState(false);
  const [activityTick, setActivityTick] = useState(0);

  useEffect(() => {
    if (!user || !isAdmin || creating) {
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        const resolved = composerRef.current?.getSectionsForSave();
        if (!resolved?.ok || !canPersistComposer(title, resolved.sections)) {
          return;
        }
        setCreating(true);
        setSaveError(null);
        try {
          const created = await createSong(
            {
              title: title.trim(),
              artist: artist.trim(),
              originalKey,
              sections: resolved.sections,
              tags,
              status: "draft",
            },
            user.uid,
          );
          await invalidateSongIndexCache();
          router.replace(`/song/${created.id}/edit`);
        } catch (error) {
          setSaveError(
            error instanceof Error ? error.message : "Could not save draft.",
          );
          setCreating(false);
        }
      })();
    }, 1800);

    return () => clearTimeout(timer);
  }, [
    user,
    isAdmin,
    title,
    artist,
    originalKey,
    tags,
    creating,
    router,
    activityTick,
  ]);

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

  return (
    <SignInRequired>
      <main className="mx-auto flex w-full max-w-5xl flex-col p-4 pb-12 sm:p-8">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-lf-text-primary sm:text-3xl">
            Add song
          </h1>
        </div>

        {saveError && (
          <p className="mb-4 text-sm text-lf-danger" role="alert">
            {saveError}
          </p>
        )}

        {creating ? (
          <p className="text-sm text-lf-text-secondary">Saving draft…</p>
        ) : null}

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
          onComposerActivity={() => setActivityTick((tick) => tick + 1)}
          actionBar={{
            onBackToLibrary: () => router.push("/"),
          }}
        />
      </main>
    </SignInRequired>
  );
}
