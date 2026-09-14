"use client";

import { useState } from "react";

import { IconActionButton } from "@/components/IconActionButton";
import {
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

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <IconActionButton
        label={`Share ${song.title}`}
        variant="default"
        onClick={() => {
          void handleShare();
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" x2="12" y1="2" y2="15" />
        </svg>
      </IconActionButton>
      {message && (
        <span className="sr-only" aria-live="polite">
          {message}
        </span>
      )}
    </div>
  );
}
