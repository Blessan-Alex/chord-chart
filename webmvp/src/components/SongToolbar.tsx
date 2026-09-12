"use client";

import { useState } from "react";

import { ALL_KEYS, type Key } from "@/lib/engine";

export type SongViewMode = "chords" | "numbers";

export type SongToolbarProps = {
  title: string;
  originalKey: Key;
  version: number | null;
  viewMode: SongViewMode;
  targetKey: string;
  isAdmin: boolean;
  editBusy?: boolean;
  performanceMode?: boolean;
  onViewModeChange: (mode: SongViewMode) => void;
  onTargetKeyChange: (key: Key) => void;
  onEdit?: () => void;
  onAddToSession?: () => void;
  onDelete?: () => void;
};

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
    ? "min-h-10 w-full rounded-lg border border-neutral-300 px-3 py-2 text-left text-sm font-medium dark:border-neutral-700"
    : "min-h-9 rounded-lg border border-neutral-300 px-3 py-1 text-sm font-medium dark:border-neutral-700";

  return (
    <>
      <button
        type="button"
        disabled={editBusy}
        onClick={onEdit}
        className={buttonClass}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onAddToSession}
        className={buttonClass}
      >
        + Session
      </button>
      <button
        type="button"
        onClick={onDelete}
        className={
          compact
            ? "min-h-10 w-full rounded-lg border border-red-300 px-3 py-2 text-left text-sm font-medium text-red-600 dark:border-red-900 dark:text-red-400"
            : "min-h-9 rounded-lg border border-red-300 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        }
      >
        Delete
      </button>
    </>
  );
}

export function SongToolbar({
  title,
  originalKey,
  version,
  viewMode,
  targetKey,
  isAdmin,
  editBusy = false,
  performanceMode = false,
  onViewModeChange,
  onTargetKeyChange,
  onEdit,
  onAddToSession,
  onDelete,
}: SongToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  if (performanceMode) {
    return (
      <header className="sticky top-0 z-10 -mx-4 border-b border-neutral-200 bg-white/95 px-4 py-2 backdrop-blur-sm sm:-mx-8 sm:px-8 dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="Song options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-neutral-300 text-lg dark:border-neutral-700"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                <button
                  type="button"
                  onClick={() => {
                    onViewModeChange(viewMode === "chords" ? "numbers" : "chords");
                    setMenuOpen(false);
                  }}
                  className="min-h-10 w-full rounded-lg px-3 py-2 text-left text-sm font-medium"
                >
                  View: {viewMode === "chords" ? "Numbers" : "Chords"}
                </button>
                {isAdmin && (
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
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 -mx-4 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8 dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
            <p className="text-xs text-neutral-500">
              Key: {originalKey}
              {version !== null && ` · v${version}`}
            </p>
          </div>
          {isAdmin && (
            <div className="relative sm:hidden">
              <button
                type="button"
                aria-label="Admin actions"
                aria-expanded={adminOpen}
                onClick={() => setAdminOpen((open) => !open)}
                className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-neutral-300 text-lg dark:border-neutral-700"
              >
                ⋯
              </button>
              {adminOpen && (
                <div className="absolute right-0 z-20 mt-1 flex w-40 flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                  <AdminActions
                    editBusy={editBusy}
                    onEdit={() => {
                      setAdminOpen(false);
                      onEdit?.();
                    }}
                    onAddToSession={() => {
                      setAdminOpen(false);
                      onAddToSession?.();
                    }}
                    onDelete={() => {
                      setAdminOpen(false);
                      onDelete?.();
                    }}
                    compact
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="hidden flex-wrap items-center gap-2 sm:flex">
              <AdminActions
                editBusy={editBusy}
                onEdit={onEdit}
                onAddToSession={onAddToSession}
                onDelete={onDelete}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <div className="flex overflow-hidden rounded-lg border border-neutral-300 text-xs dark:border-neutral-700">
              <button
                type="button"
                onClick={() => onViewModeChange("chords")}
                className={`min-h-9 px-3 py-1.5 font-medium transition-colors ${
                  viewMode === "chords"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                }`}
              >
                Chords
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("numbers")}
                className={`min-h-9 px-3 py-1.5 font-medium transition-colors ${
                  viewMode === "numbers"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                }`}
              >
                Numbers
              </button>
            </div>

            <select
              value={targetKey}
              onChange={(e) => {
                const value = e.target.value;
                if ((ALL_KEYS as readonly string[]).includes(value)) {
                  onTargetKeyChange(value as Key);
                }
              }}
              className="hidden min-h-9 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm font-semibold sm:block dark:border-neutral-700 dark:bg-neutral-950"
              aria-label="Transpose key"
            >
              {ALL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
