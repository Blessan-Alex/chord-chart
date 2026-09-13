"use client";

import { useEffect, useState } from "react";

import { listOwnedPlaylists } from "@/lib/firestore/sessions";
import { addSongToSession } from "@/lib/firestore/sessionSongs";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Session } from "@/lib/types";

type AddToPlaylistModalProps = {
  open: boolean;
  songId: string;
  songTitle: string;
  onClose: () => void;
  onAdded?: () => void;
};

function formatPlaylistDate(date: Session["date"]): string {
  return date.toDate().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function AddToPlaylistModal({
  open,
  songId,
  songTitle,
  onClose,
  onAdded,
}: AddToPlaylistModalProps) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Session[]>([]);
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
        const owned = await listOwnedPlaylists(user.uid);
        if (!cancelled) {
          setPlaylists(owned);
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
  }, [open, user]);

  if (!open) {
    return null;
  }

  const handleAdd = async (playlistId: string) => {
    if (!user) {
      return;
    }

    setAddingId(playlistId);
    setError(null);
    try {
      await addSongToSession(playlistId, songId, songTitle, user.uid);
      onAdded?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add to playlist.");
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
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated shadow-xl">
        <div className="border-b border-lf-border p-4">
          <h2 className="text-lg font-semibold text-lf-text-primary">
            Add to playlist
          </h2>
          <p className="mt-1 text-sm text-lf-text-secondary">{songTitle}</p>
        </div>

        <div className="overflow-y-auto p-2">
          {loading && (
            <p className="p-3 text-sm text-lf-text-secondary">Loading…</p>
          )}
          {error && <p className="p-3 text-sm text-lf-danger">{error}</p>}
          {!loading && playlists.length === 0 && (
            <p className="p-3 text-sm text-lf-text-secondary">
              No playlists yet. Create one from the Playlists page.
            </p>
          )}
          <ul className="divide-y divide-lf-border">
            {playlists.map((playlist) => (
              <li key={playlist.id}>
                <button
                  type="button"
                  disabled={addingId !== null}
                  onClick={() => {
                    void handleAdd(playlist.id);
                  }}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-3 text-left hover:bg-lf-bg-muted disabled:opacity-50"
                >
                  <span className="font-medium text-lf-text-primary">
                    {playlist.title}
                  </span>
                  <span className="text-xs text-lf-text-secondary">
                    {formatPlaylistDate(playlist.date)}
                    {playlist.status === "draft" ? " · Draft" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-lf-border p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[var(--lf-radius-md)] border border-lf-border px-4 py-2 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use AddToPlaylistModal */
export const AddToSessionModal = AddToPlaylistModal;
