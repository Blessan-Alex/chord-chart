"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AddToSessionModal } from "@/components/AddToSessionModal";
import { ChordLine } from "@/components/ChordLine";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ALL_KEYS, type Key } from "@/lib/engine";
import { firestoreSongToSong } from "@/lib/firestore/toSong";
import { archiveSong, getSong as getFirestoreSong } from "@/lib/firestore/songs";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSong as getLocalSong } from "@/lib/storage";
import type { Song } from "@/lib/types";

function isKey(k: string): k is Key {
  return (ALL_KEYS as readonly string[]).includes(k);
}

export default function SongPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const keyParam = searchParams.get("key");
  const { user, loading: authLoading, isAdmin } = useAuth();

  const [song, setSong] = useState<Song | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [targetKey, setTargetKey] = useState<string>("C");
  const [viewMode, setViewMode] = useState<"chords" | "numbers">("chords");
  const [showDelete, setShowDelete] = useState(false);
  const [showAddToSession, setShowAddToSession] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSong() {
      setLoaded(false);
      setDeleteError(null);

      if (user) {
        try {
          const firestoreSong = await getFirestoreSong(id);
          if (!cancelled) {
            if (firestoreSong) {
              const found = firestoreSongToSong(firestoreSong);
              setSong(found);
              if (keyParam && isKey(keyParam)) {
                setTargetKey(keyParam);
              } else if (isKey(found.originalKey)) {
                setTargetKey(found.originalKey);
              }
            } else {
              setSong(null);
            }
            setLoaded(true);
          }
          return;
        } catch {
          if (!cancelled) {
            setSong(null);
            setLoaded(true);
          }
          return;
        }
      }

      const found = getLocalSong(id);
      if (!cancelled) {
        setSong(found ?? null);
        if (found) {
          if (keyParam && isKey(keyParam)) {
            setTargetKey(keyParam);
          } else if (isKey(found.originalKey)) {
            setTargetKey(found.originalKey);
          }
        }
        setLoaded(true);
      }
    }

    if (!authLoading) {
      void loadSong();
    }

    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading, keyParam]);

  const handleDelete = async () => {
    if (!song || !user || !isAdmin) {
      return;
    }

    setDeleteError(null);
    try {
      await archiveSong(id);
      router.push("/");
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete song.",
      );
      setShowDelete(false);
    }
  };

  if (!loaded || authLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-4">
        <p className="text-neutral-400">Loading…</p>
      </main>
    );
  }

  if (!song) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4 sm:p-8">
        <h1 className="text-2xl font-semibold">Song not found</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {user
            ? "No song matches this link."
            : "Sign in to view shared songs, or open a song saved on this device."}
        </p>
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          ← Home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col p-4 sm:p-8">
      <ConfirmDialog
        open={showDelete}
        title="Delete song?"
        message={`"${song.title}" will be removed from the shared library.`}
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => setShowDelete(false)}
      />

      {user && isAdmin && (
        <AddToSessionModal
          open={showAddToSession}
          songId={id}
          songTitle={song.title}
          onClose={() => setShowAddToSession(false)}
        />
      )}

      <Link
        href="/"
        className="mb-2 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        ← Home
      </Link>

      {deleteError && (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">
          {deleteError}
        </p>
      )}

      <header className="sticky top-0 z-10 -mx-4 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8 dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold sm:text-xl">
              {song.title}
            </h1>
            <p className="text-xs text-neutral-500">Key: {song.originalKey}</p>
          </div>

          <div className="flex items-center gap-2">
            {user && isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAddToSession(true)}
                  className="min-h-9 rounded-lg border border-neutral-300 px-3 py-1 text-sm font-medium dark:border-neutral-700"
                >
                  + Session
                </button>
                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  className="min-h-9 rounded-lg border border-red-300 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </>
            )}

            <div className="flex overflow-hidden rounded-lg border border-neutral-300 text-xs dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setViewMode("chords")}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  viewMode === "chords"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                }`}
              >
                Chords
              </button>
              <button
                type="button"
                onClick={() => setViewMode("numbers")}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  viewMode === "numbers"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                }`}
              >
                Numbers
              </button>
            </div>

            <select
              value={targetKey}
              onChange={(e) =>
                isKey(e.target.value) && setTargetKey(e.target.value)
              }
              className="min-h-9 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm font-semibold dark:border-neutral-700 dark:bg-neutral-950"
            >
              {ALL_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="chord-chart mt-4 pb-8">
        {song.sections.map((section, si) => (
          <div key={`${section.label}-${si}`}>
            <div className="section-label">[{section.label}]</div>
            {section.lines.map((line, li) => (
              <ChordLine
                key={`${si}-${li}`}
                line={line}
                originalKey={song.originalKey}
                targetKey={targetKey}
                viewMode={viewMode}
              />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
