"use client";

import { useState } from "react";

import {
  canUseNativeShare,
  copySongLink,
  shareResultMessage,
  shareSongNative,
  type SongSharePayload,
} from "@/lib/sharePlaylist";

type SongShareButtonProps = {
  song: SongSharePayload;
  className?: string;
};

export function SongShareButton({ song, className = "" }: SongShareButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  const handleShare = async () => {
    setMessage(null);
    const result = await shareSongNative(song);
    const text = shareResultMessage(result);
    if (text) {
      setMessage(text);
      window.setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCopy = async () => {
    setMessage(null);
    const copied = await copySongLink(song.id);
    setMessage(copied ? "Link copied." : "Could not copy link.");
    window.setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {canUseNativeShare() ? (
        <button
          type="button"
          onClick={() => {
            void handleShare();
          }}
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-[var(--lf-radius-md)] border border-lf-border px-3 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted"
          aria-label={`Share ${song.title}`}
        >
          Share
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          void handleCopy();
        }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--lf-radius-md)] border border-lf-border text-lf-text-primary hover:bg-lf-bg-muted"
        aria-label="Copy song link"
        title="Copy link"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
          <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
        </svg>
      </button>
      {message && (
        <span className="sr-only" aria-live="polite">
          {message}
        </span>
      )}
    </div>
  );
}
