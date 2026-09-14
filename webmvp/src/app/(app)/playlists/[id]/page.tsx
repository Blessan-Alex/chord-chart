"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconActionButton } from "@/components/IconActionButton";
import { KeySelectModal } from "@/components/KeySelectModal";
import { SharePlaylistModal } from "@/components/SharePlaylistModal";
import { SignInRequired } from "@/components/SignInRequired";
import { type Key } from "@/lib/engine";
import { loadSongIndex } from "@/lib/firestore/songIndex";
import {
  moveSessionSongDown,
  moveSessionSongUp,
  removeSongFromSession,
  updateSessionSongKeyOverride,
} from "@/lib/firestore/sessionSongs";
import {
  ensurePlaylistInviteToken,
  regeneratePlaylistInviteToken,
} from "@/lib/firestore/playlistInvites";
import {
  cacheSessionOffline,
  canViewPlaylist,
  deleteSession,
  getSession,
  isPlaylistOwner,
  sharePlaylistByUsername,
  updateSessionStatus,
} from "@/lib/firestore/sessions";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSessionSongsLive } from "@/lib/hooks/useSessionSongsLive";
import { useSongSearch } from "@/lib/hooks/useSongSearch";
import {
  formatSessionDateLong,
  sessionInitials,
  sessionTileGradient,
  songInitials,
} from "@/lib/sessionDisplay";
import { sessionSongHref, startSetHref } from "@/lib/sessionNavigation";
import {
  PUBLISH_CONFIRM_MESSAGE,
  playlistVisibilityLabel,
} from "@/lib/playlistLabels";
import {
  playlistShareResultMessage,
  sharePlaylistNative,
} from "@/lib/sharePlaylist";
import type { Session, SessionSong, SongIndexEntry } from "@/lib/types";

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = typeof params.id === "string" ? params.id : "";
  const { user, isAdmin } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [indexEntries, setIndexEntries] = useState<SongIndexEntry[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [keyModalEntry, setKeyModalEntry] = useState<SessionSong | null>(null);
  const [pendingRemove, setPendingRemove] = useState<SessionSong | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const addResults = useSongSearch(indexEntries, addSearch);
  const isOwner = Boolean(user && session && isPlaylistOwner(session, user.uid));
  const canEdit = isOwner || isAdmin;
  const canDelete = canEdit;
  const showRowEdit = isOwner && editMode;
  const keyBySongId = useMemo(
    () => new Map(indexEntries.map((entry) => [entry.id, entry.key])),
    [indexEntries],
  );
  const canView = useMemo(() => {
    if (!session || !user) {
      return false;
    }
    return canViewPlaylist(session, user.uid, isAdmin);
  }, [session, user, isAdmin]);

  const {
    songs,
    isLoading: songsLoading,
    error: songsError,
    addSongOptimistic,
  } = useSessionSongsLive(sessionId, Boolean(user && canView));

  const refreshSession = useCallback(async () => {
    const nextSession = await getSession(sessionId);
    setSession(nextSession);
  }, [sessionId]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const nextSession = await getSession(sessionId);
        if (cancelled) {
          return;
        }
        setSession(nextSession);

        const canViewNow = Boolean(
          nextSession && user && canViewPlaylist(nextSession, user.uid, isAdmin),
        );

        if (canViewNow) {
          const entries = await loadSongIndex();
          if (!cancelled) {
            setIndexEntries(entries);
          }
        } else {
          setIndexEntries([]);
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
  }, [sessionId, user, isAdmin]);

  useEffect(() => {
    if (session?.shareToken) {
      setInviteToken(session.shareToken);
    }
  }, [session?.shareToken]);

  useEffect(() => {
    if (!session || !user || !isOwner) {
      if (!session?.shareToken) {
        setInviteToken(null);
      }
      return;
    }

    let cancelled = false;
    void ensurePlaylistInviteToken(session, user.uid)
      .then((token) => {
        if (!cancelled) {
          setInviteToken(token);
          setSession((current) =>
            current && current.shareToken !== token
              ? { ...current, shareToken: token }
              : current,
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not create invite link.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, user, isOwner]);

  const resolveOriginalKey = (entry: SessionSong): Key => {
    return keyBySongId.get(entry.songId) ?? "C";
  };

  const resolveDisplayKey = (entry: SessionSong): Key => {
    return entry.keyOverride ?? resolveOriginalKey(entry);
  };

  const handleShare = async (username: string) => {
    if (!session || !user) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await sharePlaylistByUsername(session, username, user.uid);
      setSession(updated);
      setActionMessage(`Added @${username.trim().toLowerCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share playlist.");
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleQuickShare = async () => {
    if (!session || !inviteToken) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await sharePlaylistNative({
        id: session.id,
        title: session.title,
        inviteToken,
      });
      const message = playlistShareResultMessage(result);
      if (message) {
        setActionMessage(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!session || !user) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteSession(session, user.uid, { isAdmin });
      router.replace("/playlists");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete playlist.");
      setShowDeleteConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerateInviteLink = async () => {
    if (!session || !user) {
      return;
    }
    const token = await regeneratePlaylistInviteToken(session, user.uid);
    setInviteToken(token);
    setSession((current) => (current ? { ...current, shareToken: token } : current));
  };

  const handleKeySelect = (entry: SessionSong, key: Key) => {
    void runAction(() =>
      updateSessionSongKeyOverride(sessionId, entry.id, key),
    );
  };

  const runAction = async (
    action: () => Promise<void>,
    successMsg?: string,
    refreshSessionAfter = false,
  ) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (refreshSessionAfter) {
        await refreshSession();
      }
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
      "Playlist is now public.",
      true,
    );
    setShowPublishConfirm(false);
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
    setBusy(true);
    setError(null);
    void addSongOptimistic(entry, user.uid)
      .then(() => {
        setActionMessage(`"${entry.title}" added.`);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not add song.");
      })
      .finally(() => {
        setBusy(false);
      });
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

  const playHref = startSetHref(sessionId, songs);
  const heroGradient = session ? sessionTileGradient(session.id) : "";

  return (
    <SignInRequired>
      <ConfirmDialog
        open={showPublishConfirm}
        title="Make playlist public?"
        message={PUBLISH_CONFIRM_MESSAGE}
        confirmLabel="Make public"
        onConfirm={() => {
          handlePublish();
        }}
        onCancel={() => setShowPublishConfirm(false)}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete playlist?"
        message={
          session
            ? `"${session.title}" and its songs will be removed permanently. Shared members will lose access.`
            : ""
        }
        confirmLabel="Delete playlist"
        onConfirm={() => {
          void handleDeletePlaylist();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

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

      <SharePlaylistModal
        open={showShareModal}
        busy={busy}
        session={
          session && inviteToken
            ? { id: session.id, title: session.title, inviteToken }
            : null
        }
        onClose={() => setShowShareModal(false)}
        onShare={handleShare}
        onLinkAction={(message) => setActionMessage(message)}
        onRegenerateLink={handleRegenerateInviteLink}
      />

      {keyModalEntry && (
        <KeySelectModal
          open
          originalKey={resolveOriginalKey(keyModalEntry)}
          selectedKey={resolveDisplayKey(keyModalEntry)}
          onSelect={(key) => handleKeySelect(keyModalEntry, key)}
          onClose={() => setKeyModalEntry(null)}
        />
      )}

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-10 sm:p-8">
        <Link
          href="/playlists"
          className="text-sm text-lf-text-secondary hover:text-lf-text-primary"
        >
          ← Playlists
        </Link>

        {loading && <p className="text-lf-text-tertiary">Loading…</p>}

        {error && <p className="text-sm text-lf-danger">{error}</p>}
        {songsError && (
          <p className="text-sm text-lf-danger">
            {songsError instanceof Error
              ? songsError.message
              : "Could not load playlist songs."}
          </p>
        )}
        {actionMessage && (
          <p className="text-sm text-lf-brand">{actionMessage}</p>
        )}

        {!loading && session && session.status === "draft" && !canView && (
          <p className="text-lf-text-secondary">
            This private playlist is only visible to the owner and invited members.
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
                    {playlistVisibilityLabel(session.status)}
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
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-lf-border text-lf-text-secondary transition-colors hover:bg-lf-bg-muted hover:text-lf-brand"
                  aria-label="Cache for offline"
                  title="Cache for offline"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M12 3v12" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M5 21h14" />
                  </svg>
                </button>

                {isOwner && (
                  <>
                    <IconActionButton
                      label="Share playlist"
                      variant="primary"
                      disabled={busy || !inviteToken}
                      onClick={() => {
                        void handleQuickShare();
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" x2="12" y1="2" y2="15" />
                      </svg>
                    </IconActionButton>
                    <IconActionButton
                      label="Invite by username"
                      onClick={() => setShowShareModal(true)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" x2="19" y1="8" y2="14" />
                        <line x1="22" x2="16" y1="11" y2="11" />
                      </svg>
                    </IconActionButton>
                  </>
                )}

                {canDelete && (
                  <IconActionButton
                    label="Delete playlist"
                    variant="danger"
                    disabled={busy}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </IconActionButton>
                )}

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode((open) => !open);
                      setShowAddPanel(false);
                    }}
                    className="rounded-[var(--lf-radius-md)] border border-lf-border px-4 py-2 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted"
                  >
                    {editMode ? "Done" : "Edit"}
                  </button>
                )}

                {canEdit && session.status === "draft" && (
                  <IconActionButton
                    label="Make playlist public"
                    disabled={busy}
                    onClick={() => setShowPublishConfirm(true)}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </IconActionButton>
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
              {songsLoading && songs.length === 0 ? (
                <p className="text-sm text-lf-text-secondary">Loading songs…</p>
              ) : songs.length === 0 ? (
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
                  {songs.map((entry, index) => {
                    const displayKey = resolveDisplayKey(entry);

                    return (
                    <li
                      key={entry.id}
                      className="group flex min-h-14 items-center gap-3 border-b border-lf-border px-4 py-2 last:border-b-0"
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

                      {showRowEdit ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setKeyModalEntry(entry)}
                            className="min-h-11 rounded-full bg-lf-bg-active px-3 text-xs font-semibold text-lf-brand hover:bg-lf-bg-muted"
                            aria-label={`Key for ${entry.songTitle}`}
                          >
                            {displayKey}
                          </button>
                          <button
                            type="button"
                            disabled={busy || index === 0}
                            onClick={() => handleMoveUp(index)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-sm hover:bg-lf-bg-muted disabled:opacity-30"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={busy || index === songs.length - 1}
                            onClick={() => handleMoveDown(index)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-sm hover:bg-lf-bg-muted disabled:opacity-30"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setPendingRemove(entry)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lf-text-tertiary hover:bg-lf-danger-bg hover:text-lf-danger"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="shrink-0 rounded-full bg-lf-bg-active px-3 py-1.5 text-xs font-semibold text-lf-brand">
                          {displayKey}
                        </span>
                      )}
                    </li>
                    );
                  })}
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
