import Link from "next/link";

import {
  formatSessionDateShort,
  sessionInitials,
  sessionTileGradient,
} from "@/lib/sessionDisplay";
import type { Session } from "@/lib/types";

type PlaylistCardProps = {
  session: Session;
  showStatus?: boolean;
};

export function PlaylistCard({ session, showStatus }: PlaylistCardProps) {
  const gradient = sessionTileGradient(session.id);

  return (
    <li>
      <Link
        href={`/playlists/${session.id}`}
        className="flex min-h-16 items-center gap-3 rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated px-4 py-3 transition-colors hover:bg-lf-bg-muted"
      >
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--lf-radius-sm)] bg-gradient-to-br ${gradient} text-sm font-bold text-white`}
          aria-hidden
        >
          {sessionInitials(session.title)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-lf-text-primary">
            {session.title}
          </p>
          <p className="truncate text-sm text-lf-text-secondary">
            {formatSessionDateShort(session.date)} · {session.songCount}{" "}
            {session.songCount === 1 ? "song" : "songs"}
            {session.ownerUsername ? (
              <span> · @{session.ownerUsername}</span>
            ) : null}
            {showStatus && session.status === "draft" ? (
              <span> · Draft</span>
            ) : null}
          </p>
        </div>
        <span className="shrink-0 text-lf-text-tertiary" aria-hidden>
          →
        </span>
      </Link>
    </li>
  );
}
