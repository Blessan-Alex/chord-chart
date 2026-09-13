"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

import { PlaylistCard } from "@/components/PlaylistCard";
import { SignInRequired } from "@/components/SignInRequired";
import {
  isPlaylistOwner,
  listPlaylistsForUser,
} from "@/lib/firestore/sessions";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Session } from "@/lib/types";

function filterPlaylists(sessions: Session[], query: string): Session[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return sessions;
  }
  return sessions.filter((session) =>
    session.title.toLowerCase().includes(q),
  );
}

export default function PlaylistsPage() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const next = await listPlaylistsForUser(user.uid);
        if (!cancelled) {
          setPlaylists(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load playlists.",
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
  }, [user]);

  const filtered = useMemo(
    () => filterPlaylists(playlists, search),
    [playlists, search],
  );
  const ownedDrafts = filtered.filter(
    (session) => isPlaylistOwner(session, user?.uid ?? "") && session.status === "draft",
  );
  const published = filtered.filter((session) => session.status === "published");

  return (
    <SignInRequired>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm text-lf-text-secondary hover:text-lf-text-primary"
            >
              ← Home
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-lf-text-primary sm:text-3xl">
              Playlists
            </h1>
            <p className="mt-1 text-sm text-lf-text-secondary">
              Set lists for rehearsals and services
            </p>
          </div>
          <Link
            href="/playlists/new"
            className="inline-flex min-h-11 items-center justify-center self-start rounded-[var(--lf-radius-md)] bg-lf-action-primary px-5 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
          >
            + New playlist
          </Link>
        </div>

        <label className="relative block">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lf-text-tertiary">
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search playlists…"
            className="min-h-12 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated py-3 pl-12 pr-4 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
          />
        </label>

        {error && <p className="text-sm text-lf-danger">{error}</p>}

        {loading ? (
          <p className="text-lf-text-tertiary">Loading…</p>
        ) : (
          <div className="flex flex-col gap-8">
            {ownedDrafts.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
                  My drafts
                </h2>
                <ul className="flex flex-col gap-3">
                  {ownedDrafts.map((session) => (
                    <PlaylistCard key={session.id} session={session} showStatus />
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
                Published
              </h2>
              {published.length === 0 ? (
                <div className="rounded-[var(--lf-radius-lg)] border border-dashed border-lf-border bg-lf-bg-muted px-4 py-8 text-center">
                  <p className="font-semibold text-lf-text-primary">
                    No playlists yet
                  </p>
                  <p className="mt-2 text-sm text-lf-text-secondary">
                    Create a playlist to build your first set list.
                  </p>
                  <Link
                    href="/playlists/new"
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-md)] bg-lf-action-primary px-6 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
                  >
                    Create playlist
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {published.map((session) => (
                    <PlaylistCard key={session.id} session={session} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </SignInRequired>
  );
}
