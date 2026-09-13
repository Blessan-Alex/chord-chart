import Link from "next/link";

type SongRowProps = {
  title: string;
  artist?: string;
  songKey: string;
  href: string;
  onDelete?: () => void;
};

function NoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-lf-text-secondary"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" />
    </svg>
  );
}

export function SongRow({
  title,
  artist = "",
  songKey,
  href,
  onDelete,
}: SongRowProps) {
  return (
    <li className="group flex min-h-16 items-stretch border-b border-lf-border last:border-b-0">
      <Link
        href={href}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-lf-bg-muted"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--lf-radius-sm)] bg-lf-bg-muted">
          <NoteIcon />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-lf-text-primary">
            {title}
          </p>
          {artist ? (
            <p className="truncate text-sm text-lf-text-secondary">{artist}</p>
          ) : (
            <p className="truncate text-sm text-lf-text-tertiary">&nbsp;</p>
          )}
        </div>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lf-bg-active text-sm font-semibold text-lf-brand">
          {songKey}
        </span>
      </Link>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="px-4 text-lf-text-tertiary transition-colors hover:text-lf-danger sm:opacity-0 sm:group-hover:opacity-100"
          title="Delete song"
          aria-label={`Delete ${title}`}
        >
          ✕
        </button>
      )}
    </li>
  );
}
