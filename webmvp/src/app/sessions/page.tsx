"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SignInRequired } from "@/components/SignInRequired";
import { listSessions } from "@/lib/firestore/sessions";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatServiceType, SESSION_STATUS_LABELS } from "@/lib/sessionLabels";
import type { Session } from "@/lib/types";

function formatSessionDate(date: Session["date"]): string {
  return date.toDate().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function SessionList({
  sessions,
  emptyMessage,
}: {
  sessions: Session[];
  emptyMessage: string;
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            href={`/sessions/${session.id}`}
            className="flex min-h-14 flex-col justify-center gap-0.5 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            <span className="font-medium">{session.title}</span>
            <span className="text-sm text-neutral-500">
              {formatServiceType(session.serviceType)} ·{" "}
              {formatSessionDate(session.date)} · {session.songCount} songs
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SessionsPage() {
  const { isAdmin } = useAuth();
  const [published, setPublished] = useState<Session[]>([]);
  const [drafts, setDrafts] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <SignInRequired>
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              ← Home
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">Sessions</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Service set lists for the team
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/sessions/new"
              className="inline-flex min-h-11 items-center justify-center rounded bg-black px-4 py-2 font-medium text-white dark:bg-white dark:text-black"
            >
              + New Session
            </Link>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {loading ? (
          <p className="text-neutral-400">Loading…</p>
        ) : (
          <div className="flex flex-col gap-8">
            {isAdmin && drafts.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  {SESSION_STATUS_LABELS.draft}
                </h2>
                <SessionList
                  sessions={drafts}
                  emptyMessage="No draft sessions."
                />
              </section>
            )}

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                {SESSION_STATUS_LABELS.published}
              </h2>
              <SessionList
                sessions={published}
                emptyMessage="No published sessions yet."
              />
            </section>
          </div>
        )}
      </main>
    </SignInRequired>
  );
}
