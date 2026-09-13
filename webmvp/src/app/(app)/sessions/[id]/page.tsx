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
  formatSessionDateLong,
  sessionInitials,
  sessionTileGradient,
  songInitials,
} from "@/lib/sessionDisplay";
import { SESSION_STATUS_LABELS } from "@/lib/sessionLabels";
import {
  sessionSongHref,
  startSetHref,
} from "@/lib/sessionNavigation";
import type { Session, SessionSong, SongIndexEntry } from "@/lib/types";

function isKey(value: string): value is Key {
  return (ALL_KEYS as readonly string[]).includes(value);
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
  const [showAddPanel, setShowAddPanel] = useState(false);
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

  const playHref = startSetHref(sessionId, songs);
  const heroGradient = session ? sessionTileGradient(session.id) : "";

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

      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-neutral-950 p-4 pb-10 text-white sm:p-8">
        <Link
          href="/sessions"
          className="text-sm text-neutral-400 hover:text-neutral-200"
        >
          ← Sessions
        </Link>

        {loading && <p className="text-neutral-500">Loading…</p>}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        {actionMessage && (
          <p className="text-sm text-emerald-400">{actionMessage}</p>
        )}

        {!loading && session && session.status === "draft" && !isAdmin && (
          <p className="text-neutral-400">
            This session is not published yet.
          </p>
        )}

        {!loading && session && (session.status === "published" || isAdmin) && (
          <>
            <header className="flex flex-col gap-5">
              <div className="flex items-end gap-4">
                <div
                  className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${heroGradient} text-2xl font-bold text-white shadow-xl sm:h-36 sm:w-36`}
                  aria-hidden
                >
                  {sessionInitials(session.title)}
                </div>
                <div className="min-w-0 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    {SESSION_STATUS_LABELS[session.status]}
                  </p>
                  <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-4xl">
                    {session.title}
                  </h1>
                  <p className="mt-2 text-sm text-neutral-400">
                    {formatSessionDateLong(session.date)} · {songs.length}{" "}
                    {songs.length === 1 ? "song" : "songs"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {playHref ? (
                  <Link
                    href={playHref}
                    className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-black shadow-lg transition-transform hover:scale-105"
                    aria-label="Start set"
                  >
                    ▶
                  </Link>
                ) : (
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-neutral-700 text-2xl text-neutral-500">
                    ▶
                  </span>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleCacheOffline}
                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-white/10"
                  aria-label="Cache for offline"
                  title="Cache for offline"
                >
                  ⬇
                </button>

                {isAdmin && session.status === "draft" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handlePublish}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium"
                  >
                    Publish
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAddPanel((open) => !open)}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium"
                  >
                    {showAddPanel ? "Done" : "+ Add songs"}
                  </button>
                )}
              </div>
            </header>

            {isAdmin && showAddPanel && (
              <section className="rounded-2xl bg-neutral-900 p-4">
                <input
                  type="search"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Search library…"
                  className="min-h-11 w-full rounded-full bg-white/10 px-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none"
                />
                {addSearch.trim() && (
                  <ul className="mt-2 max-h-48 overflow-y-auto">
                    {addResults.slice(0, 8).map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleAddSong(entry)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm hover:bg-white/5"
                        >
                          <span>{entry.title}</span>
                          <span className="text-neutral-500">+ Add</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section>
              {songs.length === 0 ? (
                <div className="rounded-2xl bg-neutral-900 p-8 text-center">
                  <p className="font-semibold">No songs yet</p>
                  <p className="mt-2 text-sm text-neutral-400">
                    {isAdmin
                      ? "Add songs to build this set list."
                      : "Songs will appear here once added."}
                  </p>
                </div>
              ) : (
                <ol className="flex flex-col">
                  {songs.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="group flex min-h-14 items-center gap-3 border-b border-white/10 py-2 last:border-b-0"
                    >
                      <span className="w-5 shrink-0 text-sm tabular-nums text-neutral-500">
                        {index + 1}
                      </span>
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-neutral-800 text-sm font-semibold text-neutral-300"
                        aria-hidden
                      >
                        {songInitials(entry.songTitle)}
                      </div>
                      <Link
                        href={sessionSongHref(sessionId, entry, index)}
                        className="min-w-0 flex-1 py-2"
                      >
                        <p className="truncate font-medium text-white group-hover:underline">
                          {entry.songTitle}
                        </p>
                      </Link>

                      {isAdmin ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <select
                            value={entry.keyOverride ?? ""}
                            onChange={(e) =>
                              handleKeyOverride(entry, e.target.value)
                            }
                            disabled={busy}
                            className="rounded-full border border-white/10 bg-neutral-900 px-2 py-1 text-xs dark:bg-neutral-900"
                            aria-label={`Key for ${entry.songTitle}`}
                          >
                            <option value="">Orig</option>
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
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm hover:bg-white/10 disabled:opacity-30"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={busy || index === songs.length - 1}
                            onClick={() => handleMoveDown(index)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm hover:bg-white/10 disabled:opacity-30"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setPendingRemove(entry)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-white/10 hover:text-red-400"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        entry.keyOverride && (
                          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-neutral-200">
                            {entry.keyOverride}
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
          <p className="text-neutral-400">Session not found.</p>
        )}
      </main>
    </SignInRequired>
  );
}
