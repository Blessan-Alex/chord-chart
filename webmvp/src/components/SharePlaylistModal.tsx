"use client";

import { useEffect, useState } from "react";

import {
  canUseNativeShare,
  copyPlaylistInviteLink,
  playlistInviteUrl,
  playlistShareResultMessage,
  sharePlaylistNative,
  type PlaylistSharePayload,
} from "@/lib/sharePlaylist";

type SharePlaylistModalProps = {
  open: boolean;
  busy?: boolean;
  session: PlaylistSharePayload | null;
  onClose: () => void;
  onShare: (username: string) => Promise<void>;
  onLinkAction?: (message: string) => void;
  onRegenerateLink?: () => Promise<void>;
};

export function SharePlaylistModal({
  open,
  busy = false,
  session,
  onClose,
  onShare,
  onLinkAction,
  onRegenerateLink,
}: SharePlaylistModalProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setUsername("");
      setError(null);
    }
  }, [open]);

  if (!open || !session) {
    return null;
  }

  const shareUrl = playlistInviteUrl(session.inviteToken);
  const nativeShareAvailable = canUseNativeShare();

  const handleCopyLink = async () => {
    setLinkBusy(true);
    setError(null);
    try {
      const copied = await copyPlaylistInviteLink(session.inviteToken);
      if (copied) {
        onLinkAction?.("Invite link copied.");
        onClose();
      } else {
        setError("Could not copy link.");
      }
    } finally {
      setLinkBusy(false);
    }
  };

  const handleNativeShare = async () => {
    setLinkBusy(true);
    setError(null);
    try {
      const result = await sharePlaylistNative(session);
      const message = playlistShareResultMessage(result);
      if (message) {
        onLinkAction?.(message);
      }
      if (result !== "cancelled" && result !== "failed") {
        onClose();
      }
      if (result === "failed") {
        setError("Could not share or copy the link.");
      }
    } finally {
      setLinkBusy(false);
    }
  };

  const handleRegenerate = async () => {
    if (!onRegenerateLink) {
      return;
    }
    setLinkBusy(true);
    setError(null);
    try {
      await onRegenerateLink();
      onLinkAction?.("Invite link reset. Old links no longer work.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset link.");
    } finally {
      setLinkBusy(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onShare(username.trim());
      setUsername("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share playlist.");
    }
  };

  const actionsDisabled = busy || linkBusy;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close share playlist dialog"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-lf-text-primary">
            Share playlist
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-lf-text-secondary hover:bg-lf-bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-lf-text-secondary">
          Anyone with this link can join after signing in.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {nativeShareAvailable && (
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={() => {
                void handleNativeShare();
              }}
              className="min-h-12 w-full rounded-[var(--lf-radius-md)] bg-lf-action-primary text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-50"
            >
              Share to WhatsApp, Messages…
            </button>
          )}
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={() => {
              void handleCopyLink();
            }}
            className="min-h-12 w-full rounded-[var(--lf-radius-md)] border border-lf-border text-sm font-semibold text-lf-text-primary hover:bg-lf-bg-muted disabled:opacity-50"
          >
            Copy invite link
          </button>
          {onRegenerateLink && (
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={() => {
                void handleRegenerate();
              }}
              className="min-h-11 w-full text-sm font-medium text-lf-text-secondary hover:text-lf-text-primary disabled:opacity-50"
            >
              Reset invite link
            </button>
          )}
        </div>

        <p className="mt-3 truncate rounded-[var(--lf-radius-md)] bg-lf-bg-muted px-3 py-2 font-mono text-xs text-lf-text-secondary">
          {shareUrl}
        </p>

        <div className="my-5 border-t border-lf-border" />

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label className="block text-sm font-medium text-lf-text-primary">
            Or add by username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="mt-2 min-h-11 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-muted px-3 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
            />
          </label>

          {error && (
            <p className="mt-3 text-sm text-lf-danger" role="alert">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-[var(--lf-radius-md)] px-4 text-sm font-medium text-lf-text-secondary hover:bg-lf-bg-muted"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={actionsDisabled || !username.trim()}
              className="min-h-11 rounded-[var(--lf-radius-md)] bg-lf-brand px-5 text-sm font-semibold text-lf-text-inverse hover:bg-lf-brand-hover disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add person"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
