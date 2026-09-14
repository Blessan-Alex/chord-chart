"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminSongRow } from "@/components/AdminSongRow";
import { AdminStatsCards } from "@/components/AdminStats";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SignInRequired } from "@/components/SignInRequired";
import {
  getAdminStats,
  type AdminStats,
} from "@/lib/firestore/adminStats";
import {
  peekFullSongIndexCache,
  subscribeSongIndexUpdates,
} from "@/lib/firestore/songIndexCache";
import { archiveSong } from "@/lib/firestore/songs";
import { formatError } from "@/lib/formatError";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSongSearch } from "@/lib/hooks/useSongSearch";
import type { SongIndexEntry } from "@/lib/types";

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

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    songCount: 0,
    playlistCount: 0,
    groupCount: 0,
  });
  const [entries, setEntries] = useState<SongIndexEntry[]>(
    () => peekFullSongIndexCache() ?? [],
  );
  const [loading, setLoading] = useState(true);
  const [indexReady, setIndexReady] = useState(
    () => peekFullSongIndexCache() !== null,
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const filteredSongs = useSongSearch(entries, searchQuery);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (authLoading || !isAdmin) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const nextStats = await getAdminStats();
        if (!cancelled) {
          setStats(nextStats);
        }
      } catch (err) {
        if (!cancelled) {
          setError(formatError(err));
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
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (authLoading || !isAdmin) {
      return;
    }

    return subscribeSongIndexUpdates((nextEntries) => {
      setEntries(nextEntries);
      setIndexReady(true);
      setStats((prev) => ({
        ...prev,
        songCount: nextEntries.length,
      }));
    });
  }, [authLoading, isAdmin]);

  const pageLoading = loading || !indexReady;

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    try {
      await archiveSong(pendingDelete.id);
      setEntries((prev) => prev.filter((entry) => entry.id !== pendingDelete.id));
      setStats((prev) => ({
        ...prev,
        songCount: Math.max(0, prev.songCount - 1),
      }));
    } catch (err) {
      setError(formatError(err));
    } finally {
      setPendingDelete(null);
    }
  };

  if (!authLoading && !isAdmin) {
    return null;
  }

  return (
    <SignInRequired>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
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
            <Link
              href="/"
              className="text-sm text-lf-text-secondary hover:text-lf-text-primary"
            >
              ← Home
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-lf-text-primary sm:text-3xl">
              Admin
            </h1>
          </div>
          <Link
            href="/import"
            className="inline-flex min-h-11 items-center justify-center self-start rounded-[var(--lf-radius-md)] bg-lf-action-primary px-5 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
          >
            + Add song
          </Link>
        </div>

        <AdminStatsCards stats={stats} loading={pageLoading} />

        <label className="relative block">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lf-text-tertiary">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs…"
            className="min-h-12 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated py-3 pl-12 pr-4 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
          />
        </label>

        {error && <p className="text-sm text-lf-danger">{error}</p>}

        {pageLoading ? (
          <p className="text-lf-text-tertiary">Loading library…</p>
        ) : filteredSongs.length === 0 ? (
          <p className="text-sm text-lf-text-secondary">
            {entries.length === 0
              ? "No songs in the library yet."
              : "No songs match your search."}
          </p>
        ) : (
          <ul className="overflow-hidden rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated divide-y divide-lf-border">
            {filteredSongs.map((entry) => (
              <AdminSongRow
                key={entry.id}
                id={entry.id}
                title={entry.title}
                artist={entry.artist ?? ""}
                songKey={entry.key}
                onDelete={() =>
                  setPendingDelete({ id: entry.id, title: entry.title })
                }
              />
            ))}
          </ul>
        )}
      </main>
    </SignInRequired>
  );
}
