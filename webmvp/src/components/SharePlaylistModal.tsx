"use client";

import { useState } from "react";

type SharePlaylistModalProps = {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onShare: (username: string) => Promise<void>;
};

export function SharePlaylistModal({
  open,
  busy = false,
  onClose,
  onShare,
}: SharePlaylistModalProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close share playlist dialog"
        className="absolute inset-0"
        onClick={onClose}
      />
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="relative w-full max-w-md rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4 shadow-xl"
      >
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

        <label className="block text-sm font-medium text-lf-text-primary">
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            autoFocus
            className="mt-2 min-h-11 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-muted px-3 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
          />
        </label>
        <p className="mt-2 text-sm text-lf-text-secondary">
          They need this exact username on their Profile.
        </p>

        {error && <p className="mt-3 text-sm text-lf-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-[var(--lf-radius-md)] px-4 text-sm font-medium text-lf-text-secondary hover:bg-lf-bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !username.trim()}
            className="min-h-11 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-5 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-50"
          >
            {busy ? "Sharing…" : "Share"}
          </button>
        </div>
      </form>
    </div>
  );
}
