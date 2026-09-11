"use client";

import { useEffect, useState } from "react";

import { listSessions } from "@/lib/firestore/sessions";
import { addSongToSession } from "@/lib/firestore/sessionSongs";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatServiceType } from "@/lib/sessionLabels";
import type { Session } from "@/lib/types";

type AddToSessionModalProps = {
  open: boolean;
  songId: string;
  songTitle: string;
  onClose: () => void;
  onAdded?: () => void;
};

function formatSessionDate(date: Session["date"]): string {
  return date.toDate().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function AddToSessionModal({
  open,
  songId,
  songTitle,
  onClose,
  onAdded,
}: AddToSessionModalProps) {
  const { user, isAdmin } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const published = await listSessions({ status: "published" });
        const drafts = isAdmin
          ? await listSessions({ status: "draft" })
          : [];
        if (!cancelled) {
          setSessions(
            [...drafts, ...published].sort(
              (a, b) => b.date.toMillis() - a.date.toMillis(),
            ),
          );
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
  }, [open, user, isAdmin]);

  if (!open) {
    return null;
  }

  const handleAdd = async (sessionId: string) => {
    if (!user) {
      return;
    }

    setAddingId(sessionId);
    setError(null);
    try {
      await addSongToSession(sessionId, songId, songTitle, user.uid);
      onAdded?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add to session.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
        <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Add to session</h2>
          <p className="mt-1 text-sm text-neutral-500">{songTitle}</p>
        </div>

        <div className="overflow-y-auto p-2">
          {loading && <p className="p-3 text-sm text-neutral-500">Loading…</p>}
          {error && (
            <p className="p-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {!loading && sessions.length === 0 && (
            <p className="p-3 text-sm text-neutral-500">
              {isAdmin
                ? "No sessions yet. Create one from the Sessions page."
                : "No published sessions available."}
            </p>
          )}
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  disabled={addingId !== null}
                  onClick={() => {
                    void handleAdd(session.id);
                  }}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-3 text-left hover:bg-neutral-50 disabled:opacity-50 dark:hover:bg-neutral-900"
                >
                  <span className="font-medium">{session.title}</span>
                  <span className="text-xs text-neutral-500">
                    {formatServiceType(session.serviceType)} ·{" "}
                    {formatSessionDate(session.date)}
                    {session.status === "draft" ? " · Draft" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
