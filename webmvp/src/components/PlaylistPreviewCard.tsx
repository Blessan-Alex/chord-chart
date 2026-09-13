import Link from "next/link";

type PlaylistPreviewCardProps = {
  title: string;
  subtitle: string;
  href: string;
};

export function PlaylistPreviewCard({
  title,
  subtitle,
  href,
}: PlaylistPreviewCardProps) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-16 items-center gap-3 rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated px-4 py-3 transition-colors hover:bg-lf-bg-muted"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--lf-radius-sm)] bg-lf-bg-muted text-lf-text-secondary">
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

        <span className="shrink-0 text-lf-text-tertiary" aria-hidden>
          →
        </span>
      </Link>
    </li>
  );
}
