"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SignInRequired } from "@/components/SignInRequired";
import { ALL_KEYS, type Key } from "@/lib/engine";
import { loadSongIndex } from "@/lib/firestore/songIndex";
import {
  addSongToSession,
  listSessionSongs,
  moveSessionSongDown,
  moveSessionSongUp,
  removeSongFromSession,
  updateSessionSongKeyOverride,
} from "@/lib/firestore/sessionSongs";
import {
  cacheSessionOffline,
  getSession,
  updateSessionStatus,
} from "@/lib/firestore/sessions";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSongSearch } from "@/lib/hooks/useSongSearch";
import {
  formatServiceType,
  SESSION_STATUS_LABELS,
} from "@/lib/sessionLabels";
import type { Session, SessionSong, SongIndexEntry } from "@/lib/types";

function isKey(value: string): value is Key {
  return (ALL_KEYS as readonly string[]).includes(value);
}

function formatSessionDate(date: Session["date"]): string {
  return date.toDate().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function songHref(songId: string, keyOverride: Key | null): string {
  if (keyOverride) {
    return `/song/${songId}?key=${encodeURIComponent(keyOverride)}`;
  }
  return `/song/${songId}`;
}

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = typeof params.id === "string" ? params.id : "";
  const { user, isAdmin } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [songs, setSongs] = useState<SessionSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [indexEntries, setIndexEntries] = useState<SongIndexEntry[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [pendingRemove, setPendingRemove] = useState<SessionSong | null>(null);
  const [busy, setBusy] = useState(false);

  const addResults = useSongSearch(indexEntries, addSearch);

  const refresh = useCallback(async () => {
    const [nextSession, nextSongs] = await Promise.all([
      getSession(sessionId),
      listSessionSongs(sessionId),
    ]);
    setSession(nextSession);
    setSongs(nextSongs);
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        await refresh();
        if (isAdmin) {
          const entries = await loadSongIndex();
          if (!cancelled) {
            setIndexEntries(entries);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load session.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, isAdmin, refresh]);

  const runAction = async (action: () => Promise<void>, successMsg?: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
      if (successMsg) {
        setActionMessage(successMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = () => {
    void runAction(
      () => updateSessionStatus(sessionId, "published"),
      "Session published.",
    );
  };

  const handleCacheOffline = () => {
    void runAction(
      () => cacheSessionOffline(sessionId),
      "Session cached for offline use.",
    );
  };

  const handleAddSong = (entry: SongIndexEntry) => {
    if (!user) {
      return;
    }
    void runAction(
      () => addSongToSession(sessionId, entry.id, entry.title, user.uid),
      `"${entry.title}" added.`,
    );
  };

  const handleRemove = async () => {
    if (!pendingRemove) {
      return;
    }
    await runAction(() =>
      removeSongFromSession(sessionId, pendingRemove.id),
    );
    setPendingRemove(null);
  };

  const handleMoveUp = (index: number) => {
    void runAction(() => moveSessionSongUp(sessionId, songs, index));
  };

  const handleMoveDown = (index: number) => {
    void runAction(() => moveSessionSongDown(sessionId, songs, index));
  };

  const handleKeyOverride = (entry: SessionSong, value: string) => {
    const keyOverride = value && isKey(value) ? value : null;
    void runAction(() =>
      updateSessionSongKeyOverride(sessionId, entry.id, keyOverride),
    );
  };

  return (
    <SignInRequired>
      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove from set list?"
        message={
          pendingRemove
            ? `"${pendingRemove.songTitle}" will be removed from this session.`
            : ""
        }
        confirmLabel="Remove"
        onConfirm={() => {
          void handleRemove();
        }}
        onCancel={() => setPendingRemove(null)}
      />

      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
        <Link
          href="/sessions"
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          ← Sessions
        </Link>

        {loading && <p className="text-neutral-400">Loading…</p>}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {actionMessage && (
          <p className="text-sm text-green-700 dark:text-green-400">
            {actionMessage}
          </p>
        )}

        {!loading && session && session.status === "draft" && !isAdmin && (
          <p className="text-neutral-600 dark:text-neutral-400">
            This session is not published yet.
          </p>
        )}

        {!loading && session && (session.status === "published" || isAdmin) && (
          <>
            <header className="flex flex-col gap-3">
              <div>
                <h1 className="text-2xl font-semibold">{session.title}</h1>
                <p className="mt-1 text-sm text-neutral-500">
                  {formatServiceType(session.serviceType)} ·{" "}
                  {formatSessionDate(session.date)}
                </p>
                <p className="text-xs text-neutral-400">
                  {SESSION_STATUS_LABELS[session.status]} · {songs.length}{" "}
                  songs
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleCacheOffline}
                  className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium dark:border-neutral-700"
                >
                  Cache for offline
                </button>
                {isAdmin && session.status === "draft" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handlePublish}
                    className="rounded bg-black px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
                  >
                    Publish session
                  </button>
                )}
              </div>
            </header>

            {isAdmin && (
              <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  Add songs
                </h2>
                <input
                  type="search"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Search library…"
                  className="mt-3 min-h-10 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                />
                {addSearch.trim() && (
                  <ul className="mt-2 max-h-48 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                    {addResults.slice(0, 8).map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleAddSong(entry)}
                          className="flex w-full items-center justify-between px-2 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        >
                          <span>{entry.title}</span>
                          <span className="text-neutral-400">+ Add</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                Set list
              </h2>
              {songs.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No songs in this session yet.
                </p>
              ) : (
                <ol className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {songs.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
                    >
                      <span className="w-6 shrink-0 text-sm text-neutral-400">
                        {index + 1}.
                      </span>
                      <Link
                        href={songHref(entry.songId, entry.keyOverride)}
                        className="min-w-0 flex-1 font-medium hover:underline"
                      >
                        {entry.songTitle}
                      </Link>
                      {isAdmin ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={entry.keyOverride ?? ""}
                            onChange={(e) =>
                              handleKeyOverride(entry, e.target.value)
                            }
                            disabled={busy}
                            className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                            aria-label={`Key for ${entry.songTitle}`}
                          >
                            <option value="">Original</option>
                            {ALL_KEYS.map((key) => (
                              <option key={key} value={key}>
                                {key}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={busy || index === 0}
                            onClick={() => handleMoveUp(index)}
                            className="rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={busy || index === songs.length - 1}
                            onClick={() => handleMoveDown(index)}
                            className="rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setPendingRemove(entry)}
                            className="px-2 text-neutral-400 hover:text-red-600"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        entry.keyOverride && (
                          <span className="text-sm text-neutral-500">
                            Key: {entry.keyOverride}
                          </span>
                        )
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}

        {!loading && !session && (
          <p className="text-neutral-600 dark:text-neutral-400">
            Session not found.
          </p>
        )}
      </main>
    </SignInRequired>
  );
}
