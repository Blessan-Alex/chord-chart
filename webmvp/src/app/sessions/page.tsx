"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

import { SessionTile } from "@/components/SessionTile";
import { SignInRequired } from "@/components/SignInRequired";
import { listSessions } from "@/lib/firestore/sessions";
import { useAuth } from "@/lib/hooks/useAuth";
import { SESSION_STATUS_LABELS } from "@/lib/sessionLabels";
import type { Session } from "@/lib/types";

function filterSessions(sessions: Session[], query: string): Session[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return sessions;
  }
  return sessions.filter((session) =>
    session.title.toLowerCase().includes(q),
  );
}

export default function SessionsPage() {
  const { isAdmin } = useAuth();
  const [published, setPublished] = useState<Session[]>([]);
  const [drafts, setDrafts] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const publishedSessions = await listSessions({ status: "published" });
        const draftSessions = isAdmin
          ? await listSessions({ status: "draft" })
          : [];
        if (!cancelled) {
          setPublished(publishedSessions);
          setDrafts(draftSessions);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load sessions.",
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
  }, [isAdmin]);

  const filteredPublished = useMemo(
    () => filterSessions(published, search),
    [published, search],
  );
  const filteredDrafts = useMemo(
    () => filterSessions(drafts, search),
    [drafts, search],
  );

  return (
    <SignInRequired>
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-neutral-950 p-4 text-white sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm text-neutral-400 hover:text-neutral-200"
            >
              ← Home
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Sessions</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Set lists for rehearsals and services
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/sessions/new"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              + New session
            </Link>
          )}
        </div>

        <label className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
          <span className="text-neutral-400" aria-hidden>
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions…"
            className="min-h-10 w-full bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
          />
        </label>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {loading ? (
          <p className="text-neutral-500">Loading…</p>
        ) : (
          <div className="flex flex-col gap-8">
            {isAdmin && filteredDrafts.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {SESSION_STATUS_LABELS.draft}
                </h2>
                <ul className="flex flex-col gap-1">
                  {filteredDrafts.map((session) => (
                    <SessionTile key={session.id} session={session} showStatus />
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {SESSION_STATUS_LABELS.published}
              </h2>
              {filteredPublished.length === 0 ? (
                <div className="rounded-2xl bg-neutral-900 p-8 text-center">
                  <p className="text-lg font-semibold text-white">
                    No sessions yet
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    {isAdmin
                      ? "Create a session to build your first set list."
                      : "Published set lists will appear here."}
                  </p>
                  {isAdmin && (
                    <Link
                      href="/sessions/new"
                      className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black"
                    >
                      Create session
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {filteredPublished.map((session) => (
                    <SessionTile key={session.id} session={session} />
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
