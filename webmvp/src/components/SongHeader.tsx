"use client";

import Link from "next/link";
import { useState } from "react";

export function adminSongActionLabels(isAdmin: boolean): string[] {
  if (!isAdmin) {
    return [];
  }
  return ["Edit", "+ Session", "Delete"];
}

function AdminActions({
  editBusy,
  onEdit,
  onAddToSession,
  onDelete,
  compact,
}: {
  editBusy: boolean;
  onEdit?: () => void;
  onAddToSession?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  const buttonClass = compact
    ? "min-h-10 w-full rounded-[var(--lf-radius-md)] border border-lf-border px-3 py-2 text-left text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted"
    : "min-h-9 rounded-[var(--lf-radius-md)] border border-lf-border px-3 py-1 text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted";

  return (
    <>
      <button type="button" disabled={editBusy} onClick={onEdit} className={buttonClass}>
        Edit
      </button>
      <button type="button" onClick={onAddToSession} className={buttonClass}>
        + Session
      </button>
      <button
        type="button"
        onClick={onDelete}
        className={
          compact
            ? "min-h-10 w-full rounded-[var(--lf-radius-md)] border border-lf-danger/30 px-3 py-2 text-left text-sm font-medium text-lf-danger hover:bg-lf-danger-bg"
            : "min-h-9 rounded-[var(--lf-radius-md)] border border-lf-danger/30 px-3 py-1 text-sm font-medium text-lf-danger hover:bg-lf-danger-bg"
        }
      >
        Delete
      </button>
    </>
  );
}

type SongHeaderProps = {
  title: string;
  artist?: string;
  backHref: string;
  backLabel?: string;
  compact?: boolean;
  isAdmin?: boolean;
  editBusy?: boolean;
  onEdit?: () => void;
  onAddToSession?: () => void;
  onDelete?: () => void;
};

export function SongHeader({
  title,
  artist = "",
  backHref,
  backLabel = "Back",
  compact = false,
  isAdmin = false,
  editBusy = false,
  onEdit,
  onAddToSession,
  onDelete,
}: SongHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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

              {isAdmin && (
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Song actions"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-lf-border text-lg text-lf-text-primary hover:bg-lf-bg-muted"
                  >
                    ⋯
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 z-30 mt-1 flex w-40 flex-col gap-1 rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-1 shadow-lg">
                      <AdminActions
                        editBusy={editBusy}
                        onEdit={() => {
                          setMenuOpen(false);
                          onEdit?.();
                        }}
                        onAddToSession={() => {
                          setMenuOpen(false);
                          onAddToSession?.();
                        }}
                        onDelete={() => {
                          setMenuOpen(false);
                          onDelete?.();
                        }}
                        compact
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
