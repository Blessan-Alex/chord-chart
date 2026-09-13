"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  isPlaylistOwner,
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
import { sessionSongHref, startSetHref } from "@/lib/sessionNavigation";
import type { Session, SessionSong, SongIndexEntry } from "@/lib/types";

function isKey(value: string): value is Key {
  return (ALL_KEYS as readonly string[]).includes(value);
}

export default function PlaylistDetailPage() {
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
  const isOwner = Boolean(user && session && isPlaylistOwner(session, user.uid));
  const canEdit = isOwner || isAdmin;
  const canView = useMemo(() => {
    if (!session || !user) {
      return false;
    }
    return (
      session.status === "published" ||
      canEdit ||
      session.sharedWith.includes(user.uid)
    );
  }, [session, user, canEdit]);

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
        if (canEdit) {
          const entries = await loadSongIndex();
          if (!cancelled) {
            setIndexEntries(entries);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load playlist.",
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
  }, [sessionId, canEdit, refresh]);

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
      "Playlist published.",
    );
  };

  const handleCacheOffline = () => {
    void runAction(
      () => cacheSessionOffline(sessionId),
      "Playlist cached for offline use.",
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
    await runAction(() => removeSongFromSession(sessionId, pendingRemove.id));
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
        title="Remove from playlist?"
        message={
          pendingRemove
            ? `"${pendingRemove.songTitle}" will be removed from this playlist.`
            : ""
        }
        confirmLabel="Remove"
        onConfirm={() => {
          void handleRemove();
        }}
        onCancel={() => setPendingRemove(null)}
      />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-10 sm:p-8">
        <Link
          href="/playlists"
          className="text-sm text-lf-text-secondary hover:text-lf-text-primary"
        >
          ← Playlists
        </Link>

        {loading && <p className="text-lf-text-tertiary">Loading…</p>}

        {error && <p className="text-sm text-lf-danger">{error}</p>}
        {actionMessage && (
          <p className="text-sm text-lf-brand">{actionMessage}</p>
        )}

        {!loading && session && session.status === "draft" && !canView && (
          <p className="text-lf-text-secondary">
            This playlist is not published yet.
          </p>
        )}

        {!loading && session && canView && (
          <>
            <header className="flex flex-col gap-5">
              <div className="flex items-end gap-4">
                <div
                  className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-[var(--lf-radius-md)] bg-gradient-to-br ${heroGradient} text-xl font-bold text-white sm:h-28 sm:w-28`}
                  aria-hidden
                >
                  {sessionInitials(session.title)}
                </div>
                <div className="min-w-0 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
                    {session.status === "draft" ? "Draft" : "Published"}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold leading-tight text-lf-text-primary sm:text-3xl">
                    {session.title}
                  </h1>
                  <p className="mt-2 text-sm text-lf-text-secondary">
                    {formatSessionDateLong(session.date)} · {songs.length}{" "}
                    {songs.length === 1 ? "song" : "songs"}
                    {session.ownerUsername ? (
                      <span> · @{session.ownerUsername}</span>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {playHref ? (
                  <Link
                    href={playHref}
                    className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-lf-brand text-2xl text-lf-text-inverse shadow-md transition-transform hover:scale-105"
                    aria-label="Start set"
                  >
                    ▶
                  </Link>
                ) : (
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-lf-bg-muted text-2xl text-lf-text-tertiary">
                    ▶
                  </span>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleCacheOffline}
                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-lf-border text-lf-text-secondary transition-colors hover:bg-lf-bg-muted"
                  aria-label="Cache for offline"
                  title="Cache for offline"
                >
                  ⬇
                </button>

                {canEdit && session.status === "draft" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handlePublish}
                    className="rounded-[var(--lf-radius-md)] border border-lf-border px-4 py-2 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted"
                  >
                    Publish
                  </button>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowAddPanel((open) => !open)}
                    className="rounded-[var(--lf-radius-md)] border border-dashed border-lf-border px-4 py-2 text-sm font-medium text-lf-brand hover:bg-lf-bg-muted"
                  >
                    {showAddPanel ? "Done" : "+ Add songs"}
                  </button>
                )}
              </div>
            </header>

            {canEdit && showAddPanel && (
              <section className="rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4">
                <input
                  type="search"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Search library…"
                  className="min-h-11 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-4 text-sm text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
                />
                {addSearch.trim() && (
                  <ul className="mt-2 max-h-48 overflow-y-auto">
                    {addResults.slice(0, 8).map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleAddSong(entry)}
                          className="flex w-full items-center justify-between rounded-[var(--lf-radius-md)] px-3 py-3 text-left text-sm hover:bg-lf-bg-muted"
                        >
                          <span>{entry.title}</span>
                          <span className="text-lf-text-tertiary">+ Add</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section>
              {songs.length === 0 ? (
                <div className="rounded-[var(--lf-radius-lg)] border border-dashed border-lf-border bg-lf-bg-muted px-4 py-8 text-center">
                  <p className="font-semibold text-lf-text-primary">No songs yet</p>
                  <p className="mt-2 text-sm text-lf-text-secondary">
                    {canEdit
                      ? "Add songs to build this set list."
                      : "Songs will appear here once added."}
                  </p>
                </div>
              ) : (
                <ol className="overflow-hidden rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated">
                  {songs.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="group flex min-h-16 items-center gap-3 border-b border-lf-border px-4 py-2 last:border-b-0"
                    >
                      <span className="w-5 shrink-0 text-sm tabular-nums text-lf-text-tertiary">
                        {index + 1}
                      </span>
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--lf-radius-sm)] bg-lf-bg-muted text-sm font-semibold text-lf-text-secondary"
                        aria-hidden
                      >
                        {songInitials(entry.songTitle)}
                      </div>
                      <Link
                        href={sessionSongHref(sessionId, entry, index)}
                        className="min-w-0 flex-1 py-2"
                      >
                        <p className="truncate font-medium text-lf-text-primary group-hover:text-lf-brand">
                          {entry.songTitle}
                        </p>
                      </Link>

                      {canEdit ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <select
                            value={entry.keyOverride ?? ""}
                            onChange={(e) =>
                              handleKeyOverride(entry, e.target.value)
                            }
                            disabled={busy}
                            className="rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-2 py-1 text-xs text-lf-text-primary"
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
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm hover:bg-lf-bg-muted disabled:opacity-30"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={busy || index === songs.length - 1}
                            onClick={() => handleMoveDown(index)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm hover:bg-lf-bg-muted disabled:opacity-30"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setPendingRemove(entry)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lf-text-tertiary hover:bg-lf-danger-bg hover:text-lf-danger"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        entry.keyOverride && (
                          <span className="shrink-0 rounded-full bg-lf-bg-active px-2.5 py-1 text-xs font-semibold text-lf-brand">
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
          <p className="text-lf-text-secondary">Playlist not found.</p>
        )}
      </main>
    </SignInRequired>
  );
}
