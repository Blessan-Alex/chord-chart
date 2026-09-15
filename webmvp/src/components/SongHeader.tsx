"use client";

import Link from "next/link";

type SongHeaderProps = {
  title: string;
  artist?: string;
  backHref: string;
  backLabel?: string;
  compact?: boolean;
  trailing?: React.ReactNode;
};

export function SongHeader({
  title,
  artist = "",
  backHref,
  backLabel = "Back",
  compact = false,
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

        {trailing}
      </div>
    </header>
  );
}
