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
};

export function SongHeader({
  title,
  artist = "",
  backHref,
  backLabel = "Back",
  compact = false,
  showAddToPlaylist = false,
  onAddToPlaylist,
}: SongHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-4 border-b border-lf-border bg-lf-bg-page/95 px-4 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8">
      <div className="flex items-start gap-3">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--lf-radius-md)] border border-lf-border text-lf-text-primary hover:bg-lf-bg-muted"
        >
          ←
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1
                className={`truncate font-semibold text-lf-text-primary ${
                  compact ? "text-base" : "text-xl sm:text-2xl"
                }`}
              >
                {title}
              </h1>
              {artist ? (
                <p className="truncate text-sm text-lf-text-secondary">
                  {artist}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Favorite song"
                disabled
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-lf-text-tertiary"
                title="Favorites coming soon"
              >
                ♡
              </button>

              {showAddToPlaylist && (
                <button
                  type="button"
                  onClick={onAddToPlaylist}
                  className="min-h-10 rounded-[var(--lf-radius-md)] border border-lf-border px-3 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted"
                >
                  + Playlist
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
