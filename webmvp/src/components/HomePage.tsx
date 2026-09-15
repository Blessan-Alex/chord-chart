"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageError } from "@/components/PageError";
import {
  PlaylistPreviewCard,
  type PlaylistPreviewSong,
} from "@/components/PlaylistPreviewCard";
import { SongRow } from "@/components/SongRow";
import { SongRowSkeleton } from "@/components/SongRowSkeleton";
import { HOME_LIBRARY_PAGE_SIZE, LIBRARY_BROWSE_CAP } from "@/lib/constants";
import { ALL_KEYS, type Key } from "@/lib/engine";
import { formatError } from "@/lib/formatError";
import { LANGUAGE_TAGS } from "@/lib/languageTags";
import { listGroupsForMember } from "@/lib/firestore/groups";
import { listSessionSongs } from "@/lib/firestore/sessionSongs";
import {
  loadSongIndexCachedProgressive,
  peekSongIndexCache,
  subscribeSongIndexUpdates,
} from "@/lib/firestore/songIndexCache";
import { listOwnedPlaylists, listPlaylistsForGroup } from "@/lib/firestore/sessions";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRecentSongs } from "@/lib/hooks/useRecentSongs";
import { useSongSearch } from "@/lib/hooks/useSongSearch";
import { filterRecentByKnownIds } from "@/lib/recentSongs";
import { deleteSong, getSongs } from "@/lib/storage";
import type { Group, Session, Song, SongIndexEntry } from "@/lib/types";

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
  const { user } = useAuth();
  const { recentSongs } = useRecentSongs();
  const [savedSongs, setSavedSongs] = useState<Song[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [indexEntries, setIndexEntries] = useState<SongIndexEntry[]>(
    () => peekSongIndexCache() ?? [],
  );
  const [indexLoading, setIndexLoading] = useState(
    () => peekSongIndexCache() === null,
  );
  const [indexError, setIndexError] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [myPlaylists, setMyPlaylists] = useState<Session[]>([]);
  const [groupPlaylists, setGroupPlaylists] = useState<Session[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [playlistPreviews, setPlaylistPreviews] = useState<
    Record<string, PlaylistPreviewSong[]>
  >({});
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [keyFilter, setKeyFilter] = useState<Key | "">("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [libraryPage, setLibraryPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
    source: "local";
  } | null>(null);

  const libraryResults = useSongSearch(
    indexEntries,
    searchQuery,
    keyFilter || undefined,
    languageFilter || undefined,
  );
  const isBrowsingAll = !searchQuery.trim() && !keyFilter && !languageFilter;
  const libraryPageCount = Math.max(
    1,
    Math.ceil(libraryResults.length / HOME_LIBRARY_PAGE_SIZE),
  );
  const displayedResults = isBrowsingAll
    ? libraryResults.slice(
        libraryPage * HOME_LIBRARY_PAGE_SIZE,
        (libraryPage + 1) * HOME_LIBRARY_PAGE_SIZE,
      )
    : libraryResults.slice(0, LIBRARY_BROWSE_CAP);
  const libraryCapped =
    !isBrowsingAll && libraryResults.length > LIBRARY_BROWSE_CAP;

  const knownSongIds = useMemo(
    () => new Set(indexEntries.map((entry) => entry.id)),
    [indexEntries],
  );

  const visibleRecent = useMemo(
    () => filterRecentByKnownIds(recentSongs, knownSongIds),
    [recentSongs, knownSongIds],
  );

  const showRecent =
    visibleRecent.length > 0 &&
    !searchQuery.trim() &&
    !keyFilter &&
    !languageFilter;

  const refreshLocalSongs = useCallback(() => {
    setSavedSongs(getSongs().sort((a, b) => a.title.localeCompare(b.title)));
  }, []);

  useEffect(() => {
    refreshLocalSongs();
  }, [refreshLocalSongs]);

  useEffect(() => {
    setLibraryPage(0);
  }, [searchQuery, keyFilter, languageFilter]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (peekSongIndexCache() === null) {
        setIndexLoading(true);
      }
      setIndexError(null);

      try {
        let bestCount = peekSongIndexCache()?.length ?? 0;
        const entries = await loadSongIndexCachedProgressive((partial) => {
          if (cancelled || partial.length < bestCount) {
            return;
          }
          bestCount = partial.length;
          setIndexEntries(partial);
          setLoaded(true);
          setIndexLoading(false);
        });
        if (!cancelled) {
          setIndexEntries(entries);
          setLoaded(true);
          setIndexLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setIndexError(formatError(error));
          setIndexLoading(false);
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeSongIndexUpdates((entries) => {
      setIndexEntries(entries);
      setLoaded(true);
      setIndexLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setMyPlaylists([]);
      setGroupPlaylists([]);
      setMyGroups([]);
      setPlaylistPreviews({});
      setSocialError(null);
      setPlaylistsLoading(false);
      return;
    }

    if (indexLoading) {
      setPlaylistsLoading(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      setPlaylistsLoading(true);
      setSocialError(null);

      try {
        const ownedPlaylists = await listOwnedPlaylists(user.uid);

        if (cancelled) {
          return;
        }

        const artistBySongId = new Map(
          indexEntries.map((entry) => [entry.id, entry.artist ?? ""]),
        );
        const owned = ownedPlaylists.slice(0, 2);
        setMyPlaylists(owned);

        let groups: Group[] = [];
        try {
          groups = await listGroupsForMember(user.uid);
        } catch (groupError) {
          console.warn("[HomePage] groups query failed:", groupError);
        }

        if (cancelled) {
          return;
        }

        setMyGroups(groups.slice(0, 2));

        const groupPlaylistLists = await Promise.all(
          groups.slice(0, 2).map((group) =>
            listPlaylistsForGroup(group.id, { limit: 2 }).catch(
              () => [] as Session[],
            ),
          ),
        );
        const groupSessions = groupPlaylistLists.flat().slice(0, 2);
        setGroupPlaylists(groupSessions);

        const previewSessions = [...owned, ...groupSessions].slice(0, 4);
        const previewEntries = await Promise.all(
          previewSessions.map(async (session) => {
            try {
              const songs = await listSessionSongs(session.id);
              return [
                session.id,
                songs.slice(0, 3).map((song) => ({
                  title: song.songTitle,
                  artist: artistBySongId.get(song.songId) ?? "",
                })),
              ] as const;
            } catch {
              return [session.id, []] as const;
            }
          }),
        );
        if (!cancelled) {
          setPlaylistPreviews(Object.fromEntries(previewEntries));
        }
      } catch (error) {
        if (!cancelled) {
          setSocialError(formatError(error));
        }
      } finally {
        if (!cancelled) {
          setPlaylistsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Fetch social previews once when the index is ready; not on every chunk merge.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- indexEntries read at fetch time only
  }, [user, indexLoading]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    try {
      deleteSong(pendingDelete.id);
      refreshLocalSongs();
    } catch (error) {
      setIndexError(formatError(error));
    } finally {
      setPendingDelete(null);
    }
  };

  const showLocalSongs =
    !user && savedSongs.length > 0 && !searchQuery.trim() && !keyFilter;

  return (
    <div className="mx-auto w-full max-w-3xl overflow-x-clip p-4 sm:p-8">
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete song?"
        message={
          pendingDelete
            ? `"${pendingDelete.title}" will be removed from this device.`
            : ""
        }
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-lf-text-secondary">
          {indexLoading
            ? "Loading…"
            : `${indexEntries.length} songs`}
        </p>

        {!user && (
          <Link
            href="/import"
            className="inline-flex min-h-11 items-center justify-center self-start rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
          >
            + Add song
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-8">
        {!user && (
          <p className="text-sm text-lf-text-secondary">
            Guest ·{" "}
            <Link href="/login" className="font-medium text-lf-brand hover:underline">
              Sign in
            </Link>{" "}
            for playlists &amp; groups
          </p>
        )}

        <div className="flex flex-col gap-3">
          <label className="relative block">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lf-text-tertiary">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs, artists, lyrics…"
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

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
              Language
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLanguageFilter("")}
                className={`min-h-9 rounded-[var(--lf-radius-md)] border px-3 text-sm font-medium transition-colors ${
                  !languageFilter
                    ? "border-lf-brand bg-lf-bg-active text-lf-brand"
                    : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
                }`}
              >
                All
              </button>
              {LANGUAGE_TAGS.map((entry) => {
                const isSelected = languageFilter === entry.value;
                return (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() =>
                      setLanguageFilter(isSelected ? "" : entry.value)
                    }
                    className={`min-h-9 rounded-[var(--lf-radius-md)] border px-3 text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-lf-brand bg-lf-bg-active text-lf-brand"
                        : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
                    }`}
                  >
                    {entry.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {indexError && <PageError title="Library error" error={indexError} />}
        {socialError && (
          <PageError title="Could not load playlists" error={socialError} />
        )}

        {showRecent && (
          <section>
            <SectionHeader title="Recently viewed" />
            <ul className="overflow-hidden rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated">
              {visibleRecent.map((entry) => (
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

        {user && !searchQuery.trim() && !keyFilter && !languageFilter && (
          <>
            <section>
              <SectionHeader title="My playlists" seeAllHref="/playlists" />
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
                      href={`/playlists/${session.id}`}
                      previewSongs={playlistPreviews[session.id] ?? []}
                    />
                  ))}
                </ul>
              ) : (
                <div className="rounded-[var(--lf-radius-lg)] border border-dashed border-lf-border bg-lf-bg-muted px-4 py-6 text-sm text-lf-text-secondary">
                  No playlists yet.{" "}
                  <Link
                    href="/playlists/new"
                    className="font-medium text-lf-brand hover:underline"
                  >
                    Create one
                  </Link>
                </div>
              )}
            </section>

            <section>
              <SectionHeader title="Group playlists" seeAllHref="/groups" />
              {playlistsLoading ? (
                <p className="text-sm text-lf-text-secondary">Loading…</p>
              ) : groupPlaylists.length > 0 ? (
                <ul className="flex flex-col gap-3">
                  {groupPlaylists.map((session) => {
                    const groupName = myGroups.find(
                      (group) => group.id === session.groupId,
                    )?.name;
                    return (
                      <PlaylistPreviewCard
                        key={session.id}
                        title={session.title}
                        subtitle={
                          groupName
                            ? `${groupName} · ${session.songCount} ${
                                session.songCount === 1 ? "song" : "songs"
                              }`
                            : `${session.songCount} ${
                                session.songCount === 1 ? "song" : "songs"
                              }`
                        }
                        href={`/playlists/${session.id}`}
                        previewSongs={playlistPreviews[session.id] ?? []}
                      />
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-[var(--lf-radius-lg)] border border-dashed border-lf-border bg-lf-bg-muted px-4 py-6 text-sm text-lf-text-secondary">
                  No group playlists yet.{" "}
                  <Link
                    href="/groups"
                    className="font-medium text-lf-brand hover:underline"
                  >
                    Join or create a group
                  </Link>
                </div>
              )}
            </section>
          </>
        )}

        {showLocalSongs && (
          <section>
            <SectionHeader title="On this device" />
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
        )}

        {(loaded || indexLoading) && (
          <section>
            <SectionHeader title="All songs" />
            {indexLoading && indexEntries.length === 0 ? (
              <ul className="overflow-hidden rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated">
                {Array.from({ length: HOME_LIBRARY_PAGE_SIZE }).map((_, index) => (
                  <SongRowSkeleton key={index} />
                ))}
              </ul>
            ) : displayedResults.length === 0 ? (
              <p className="text-sm text-lf-text-secondary">
                {indexEntries.length === 0
                  ? "No songs in the library yet."
                  : "No songs match your search."}
              </p>
            ) : (
              <>
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
                      tags={entry.tags}
                      href={`/song/${entry.id}`}
                    />
                  ))}
                </ul>
                {isBrowsingAll && libraryResults.length > HOME_LIBRARY_PAGE_SIZE && (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={libraryPage === 0}
                      onClick={() => setLibraryPage((page) => Math.max(0, page - 1))}
                      className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-md)] border border-lf-border px-4 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted disabled:opacity-40"
                      aria-label="Previous page"
                    >
                      ← Prev
                    </button>
                    <p className="text-sm text-lf-text-secondary">
                      {libraryPage + 1} / {libraryPageCount}
                    </p>
                    <button
                      type="button"
                      disabled={libraryPage >= libraryPageCount - 1}
                      onClick={() =>
                        setLibraryPage((page) =>
                          Math.min(libraryPageCount - 1, page + 1),
                        )
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-md)] border border-lf-border px-4 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted disabled:opacity-40"
                      aria-label="Next page"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
