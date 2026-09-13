"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageError } from "@/components/PageError";
import { PlaylistPreviewCard } from "@/components/PlaylistPreviewCard";
import { SongRow } from "@/components/SongRow";
import { LIBRARY_BROWSE_CAP } from "@/lib/constants";
import { ALL_KEYS, type Key } from "@/lib/engine";
import { formatError } from "@/lib/formatError";
import { loadSongIndex } from "@/lib/firestore/songIndex";
import { listSessions } from "@/lib/firestore/sessions";
import { archiveSong } from "@/lib/firestore/songs";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRecentSongs } from "@/lib/hooks/useRecentSongs";
import { useSongSearch } from "@/lib/hooks/useSongSearch";
import { deleteSong, getSongs } from "@/lib/storage";
import type { Session, Song, SongIndexEntry } from "@/lib/types";

function isKey(value: string): value is Key {
  return (ALL_KEYS as readonly string[]).includes(value);
}

function SectionHeader({
  title,
  seeAllHref,
}: {
  title: string;
  seeAllHref?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
        {title}
      </h2>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="text-sm font-medium text-lf-brand hover:underline"
        >
          See all
        </Link>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function HomePage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { recentSongs } = useRecentSongs();
  const [savedSongs, setSavedSongs] = useState<Song[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [indexEntries, setIndexEntries] = useState<SongIndexEntry[]>([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [myPlaylists, setMyPlaylists] = useState<Session[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [keyFilter, setKeyFilter] = useState<Key | "">("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
    source: "local" | "firestore";
  } | null>(null);

  const libraryResults = useSongSearch(
    indexEntries,
    searchQuery,
    keyFilter || undefined,
  );
  const isBrowsingAll = !searchQuery.trim() && !keyFilter;
  const displayedResults = isBrowsingAll
    ? libraryResults.slice(0, LIBRARY_BROWSE_CAP)
    : libraryResults;
  const libraryCapped =
    isBrowsingAll && libraryResults.length > LIBRARY_BROWSE_CAP;

  const refreshLocalSongs = useCallback(() => {
    setSavedSongs(getSongs().sort((a, b) => a.title.localeCompare(b.title)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (user) {
      return;
    }
    refreshLocalSongs();
  }, [user, refreshLocalSongs]);

  useEffect(() => {
    if (!user) {
      setIndexEntries([]);
      setIndexError(null);
      setMyPlaylists([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      setIndexLoading(true);
      setPlaylistsLoading(true);
      setIndexError(null);

      try {
        const [entries, published, drafts] = await Promise.all([
          loadSongIndex(),
          listSessions({ status: "published" }),
          isAdmin ? listSessions({ status: "draft" }) : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setIndexEntries(entries);
          const owned = [...published, ...drafts]
            .filter((session) => session.createdBy === user.uid)
            .sort((a, b) => b.date.toMillis() - a.date.toMillis())
            .slice(0, 2);
          setMyPlaylists(owned);
        }
      } catch (error) {
        if (!cancelled) {
          setIndexError(formatError(error));
        }
      } finally {
        if (!cancelled) {
          setIndexLoading(false);
          setPlaylistsLoading(false);
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    try {
      if (pendingDelete.source === "local") {
        deleteSong(pendingDelete.id);
        refreshLocalSongs();
      } else {
        await archiveSong(pendingDelete.id);
        setIndexEntries((prev) =>
          prev.filter((entry) => entry.id !== pendingDelete.id),
        );
      }
    } catch (error) {
      setIndexError(formatError(error));
    } finally {
      setPendingDelete(null);
    }
  };

  const showAddSong = !user || isAdmin;
  const showRecent = user && recentSongs.length > 0 && !searchQuery.trim() && !keyFilter;

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-8">
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete song?"
        message={
          pendingDelete
            ? `"${pendingDelete.title}" will be removed from the library.`
            : ""
        }
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-lf-text-primary sm:text-3xl">
            Home
          </h1>
          <p className="mt-1 text-sm text-lf-text-secondary">
            {authLoading || indexLoading
              ? "Loading library…"
              : user
                ? `${indexEntries.length} songs in the library`
                : `${savedSongs.length} songs on this device`}
          </p>
        </div>

        {showAddSong && (
          <Link
            href="/import"
            className="inline-flex min-h-11 items-center justify-center self-start rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
          >
            + Add song
          </Link>
        )}
      </div>

      {user ? (
        <div className="mt-8 flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <label className="relative block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lf-text-tertiary">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs, artists…"
                className="min-h-12 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated py-3 pl-12 pr-4 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
              />
            </label>

            <select
              value={keyFilter}
              onChange={(e) => {
                const value = e.target.value;
                setKeyFilter(value && isKey(value) ? value : "");
              }}
              className="min-h-11 max-w-xs rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-3 text-sm text-lf-text-primary"
              aria-label="Filter by key"
            >
              <option value="">All keys</option>
              {ALL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          {indexError && <PageError title="Library error" error={indexError} />}

          {showRecent && (
            <section>
              <SectionHeader title="Recently viewed" />
              <ul className="overflow-hidden rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated">
                {recentSongs.map((entry) => (
                  <SongRow
                    key={entry.songId}
                    title={entry.title}
                    artist={entry.artist}
                    songKey={entry.key}
                    href={`/song/${entry.songId}`}
                  />
                ))}
              </ul>
            </section>
          )}

          {!searchQuery.trim() && !keyFilter && (
            <>
              <section>
                <SectionHeader title="My playlists" seeAllHref="/sessions" />
                {playlistsLoading ? (
                  <p className="text-sm text-lf-text-secondary">Loading…</p>
                ) : myPlaylists.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {myPlaylists.map((session) => (
                      <PlaylistPreviewCard
                        key={session.id}
                        title={session.title}
                        subtitle={`${session.songCount} ${
                          session.songCount === 1 ? "song" : "songs"
                        }`}
                        href={`/sessions/${session.id}`}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-[var(--lf-radius-lg)] border border-dashed border-lf-border bg-lf-bg-muted px-4 py-6 text-sm text-lf-text-secondary">
                    No playlists yet.{" "}
                    <Link href="/sessions" className="font-medium text-lf-brand hover:underline">
                      Browse playlists
                    </Link>
                  </div>
                )}
              </section>

              <section>
                <SectionHeader title="Group playlists" seeAllHref="/groups" />
                <div className="rounded-[var(--lf-radius-lg)] border border-dashed border-lf-border bg-lf-bg-muted px-4 py-6 text-sm text-lf-text-secondary">
                  No group playlists yet. Groups are coming in Phase G.
                </div>
              </section>
            </>
          )}

          {loaded && !indexLoading && (
            <section>
              <SectionHeader title="All songs" />
              {displayedResults.length === 0 ? (
                <p className="text-sm text-lf-text-secondary">
                  {indexEntries.length === 0
                    ? "No songs in the library yet."
                    : "No songs match your search."}
                </p>
              ) : (
                <ul className="overflow-hidden rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated">
                  {libraryCapped && (
                    <li className="border-b border-lf-border px-4 py-3 text-sm text-lf-text-secondary">
                      Showing {LIBRARY_BROWSE_CAP} of {libraryResults.length}{" "}
                      songs — search or filter to narrow the list.
                    </li>
                  )}
                  {displayedResults.map((entry) => (
                    <SongRow
                      key={entry.id}
                      title={entry.title}
                      artist={entry.artist ?? ""}
                      songKey={entry.key}
                      href={`/song/${entry.id}`}
                      onDelete={
                        isAdmin
                          ? () =>
                              setPendingDelete({
                                id: entry.id,
                                title: entry.title,
                                source: "firestore",
                              })
                          : undefined
                      }
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {!user && (
            <p className="text-sm text-lf-text-secondary">
              <Link href="/login" className="font-medium text-lf-brand hover:underline">
                Sign in
              </Link>{" "}
              to access the shared song library, or add songs on this device only.
            </p>
          )}

          {loaded && savedSongs.length > 0 ? (
            <section>
              <SectionHeader title="Your songs" />
              <ul className="overflow-hidden rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated">
                {savedSongs.map((song) => (
                  <SongRow
                    key={song.id}
                    title={song.title}
                    artist=""
                    songKey={song.originalKey}
                    href={`/song/${song.id}`}
                    onDelete={() =>
                      setPendingDelete({
                        id: song.id,
                        title: song.title,
                        source: "local",
                      })
                    }
                  />
                ))}
              </ul>
            </section>
          ) : (
            loaded && (
              <p className="text-sm text-lf-text-secondary">
                Use <strong>+ Add song</strong> to save charts on this device.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
