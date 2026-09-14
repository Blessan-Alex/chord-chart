import Link from "next/link";

import { playlistVisibilitySuffix } from "@/lib/playlistLabels";
import { sessionInitials, sessionTileGradient } from "@/lib/sessionDisplay";
import type { Session } from "@/lib/types";

type PlaylistCardProps = {
  session: Session;
  showStatus?: boolean;
};

export function PlaylistCard({ session, showStatus }: PlaylistCardProps) {
  const gradient = sessionTileGradient(session.id);
  const songLabel = session.songCount === 1 ? "1 song" : `${session.songCount} songs`;

  return (
    <li>
      <Link
        href={`/playlists/${session.id}`}
        className="flex min-h-[4.75rem] items-center gap-4 rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated px-4 py-4 transition-colors hover:bg-lf-bg-muted active:bg-lf-bg-muted"
      >
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--lf-radius-md)] bg-gradient-to-br ${gradient} text-base font-bold text-white`}
          aria-hidden
        >
          {sessionInitials(session.title)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-lf-text-primary">
            {session.title}
          </p>
          <p className="mt-0.5 truncate text-sm text-lf-text-secondary">
            {songLabel}
            {showStatus ? (
              <span className="text-lf-text-tertiary">
                {playlistVisibilitySuffix(session.status)}
              </span>
            ) : null}
          </p>
        </div>
        <span className="shrink-0 text-lg text-lf-text-tertiary" aria-hidden>
          →
        </span>
      </Link>
    </li>
  );
}
