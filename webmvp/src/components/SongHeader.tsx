"use client";

import Link from "next/link";

type SongHeaderProps = {
  title: string;
  artist?: string;
  backHref: string;
  backLabel?: string;
  compact?: boolean;
  showAddToPlaylist?: boolean;
  onAddToPlaylist?: () => void;
  trailing?: React.ReactNode;
};

export function SongHeader({
  title,
  artist = "",
  backHref,
  backLabel = "Back",
  compact = false,
  showAddToPlaylist = false,
  onAddToPlaylist,
  trailing,
}: SongHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-4 border-b border-lf-border bg-lf-bg-page/95 px-4 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--lf-radius-md)] border border-lf-border text-lg text-lf-text-primary hover:bg-lf-bg-muted"
        >
          ←
        </Link>

        <div className="min-w-0 flex-1">
          <h1
            className={`truncate font-semibold leading-tight text-lf-text-primary ${
              compact ? "text-lg" : "text-xl sm:text-2xl"
            }`}
          >
            {title}
          </h1>
          {artist ? (
            <p className="truncate text-sm text-lf-text-secondary">{artist}</p>
          ) : null}
        </div>

        {showAddToPlaylist && (
          <button
            type="button"
            onClick={onAddToPlaylist}
            className="min-h-11 shrink-0 rounded-[var(--lf-radius-md)] border border-lf-border px-3 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted"
          >
            + Playlist
          </button>
        )}
        {trailing}
      </div>
    </header>
  );
}
