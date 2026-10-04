import Link from "next/link";

import type { Key } from "@/lib/engine";

type AdminSongRowProps = {
  id: string;
  title: string;
  artist: string;
  songKey: Key;
  isDraft?: boolean;
  onDelete: () => void;
};

export function AdminSongRow({
  id,
  title,
  artist,
  songKey,
  isDraft = false,
  onDelete,
}: AdminSongRowProps) {
  const secondary = artist
    ? `${artist} · Key of ${songKey}`
    : `Key of ${songKey}`;

  return (
    <li className="group flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-lf-text-primary">
          {title}
          {isDraft ? (
            <span className="ml-2 rounded-full bg-lf-bg-muted px-2 py-0.5 text-xs font-medium text-lf-text-secondary">
              Draft
            </span>
          ) : null}
        </p>
        <p className="truncate text-sm text-lf-text-secondary">{secondary}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/song/${id}/edit`}
          className="min-h-9 rounded-[var(--lf-radius-md)] px-3 py-1 text-sm font-medium text-lf-text-secondary hover:bg-lf-bg-muted hover:text-lf-text-primary"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={onDelete}
          className="min-h-9 rounded-[var(--lf-radius-md)] px-3 py-1 text-sm font-medium text-lf-danger hover:bg-lf-danger-bg"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
