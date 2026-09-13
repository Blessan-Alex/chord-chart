import Link from "next/link";

import {
  formatSessionDateShort,
  sessionInitials,
  sessionTileGradient,
} from "@/lib/sessionDisplay";
import { SESSION_STATUS_LABELS } from "@/lib/sessionLabels";
import type { Session } from "@/lib/types";

type SessionTileProps = {
  session: Session;
  showStatus?: boolean;
};

export function SessionTile({ session, showStatus }: SessionTileProps) {
  const gradient = sessionTileGradient(session.id);

  return (
    <li>
      <Link
        href={`/sessions/${session.id}`}
        className="group flex min-h-[4.5rem] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
      >
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-md`}
          aria-hidden
        >
          {sessionInitials(session.title)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">{session.title}</p>
          <p className="truncate text-sm text-neutral-400">
            {formatSessionDateShort(session.date)} · {session.songCount}{" "}
            {session.songCount === 1 ? "song" : "songs"}
            {session.ownerUsername && (
              <span> · @{session.ownerUsername}</span>
            )}
            {showStatus && session.status === "draft" && (
              <span> · {SESSION_STATUS_LABELS.draft}</span>
            )}
          </p>
        </div>
        <span
          className="shrink-0 text-neutral-500 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      </Link>
    </li>
  );
}
