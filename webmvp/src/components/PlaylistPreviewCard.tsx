import Link from "next/link";

export type PlaylistPreviewSong = {
  title: string;
  artist?: string;
};

type PlaylistPreviewCardProps = {
  title: string;
  subtitle: string;
  href: string;
  previewSongs?: PlaylistPreviewSong[];
};

export function PlaylistPreviewCard({
  title,
  subtitle,
  href,
  previewSongs = [],
}: PlaylistPreviewCardProps) {
  return (
    <li>
      <Link
        href={href}
        className="block min-h-[4.75rem] rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4 transition-colors hover:bg-lf-bg-muted active:bg-lf-bg-muted"
      >
        <div className="flex min-h-14 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--lf-radius-md)] bg-lf-bg-muted text-lf-text-secondary">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-lf-text-primary">
              {title}
            </p>
            <p className="truncate text-sm text-lf-text-secondary">{subtitle}</p>
          </div>

          <span className="shrink-0 text-lg text-lf-text-tertiary" aria-hidden>
            →
          </span>
        </div>

        {previewSongs.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {previewSongs.map((song, index) => (
              <div
                key={`${index}-${song.title}`}
                className="min-w-0 rounded-[var(--lf-radius-sm)] bg-lf-bg-muted px-2 py-1.5"
              >
                <p className="truncate text-xs font-semibold text-lf-text-primary">
                  {song.title}
                </p>
                {song.artist ? (
                  <p className="truncate text-[10px] text-lf-text-secondary">
                    {song.artist}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-lf-text-tertiary">No songs added yet</p>
        )}
      </Link>
    </li>
  );
}
