"use client";

import { ALL_KEYS, type Key } from "@/lib/engine";
import { LANGUAGE_TAGS, languageLabel } from "@/lib/languageTags";

type LibraryFilterSheetProps = {
  open: boolean;
  keyFilter: Key | "";
  languageFilter: string;
  artistFilter: string;
  artists: string[];
  onKeyFilterChange: (key: Key | "") => void;
  onLanguageFilterChange: (tag: string) => void;
  onArtistFilterChange: (artist: string) => void;
  onClearFilters: () => void;
  onClose: () => void;
};

export function LibraryFilterSheet({
  open,
  keyFilter,
  languageFilter,
  artistFilter,
  artists,
  onKeyFilterChange,
  onLanguageFilterChange,
  onArtistFilterChange,
  onClearFilters,
  onClose,
}: LibraryFilterSheetProps) {
  if (!open) {
    return null;
  }

  const hasActiveFilters = Boolean(keyFilter || languageFilter || artistFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close filters"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-lf-text-primary">Filters</h2>
            <p className="text-sm text-lf-text-secondary">
              Filter by key, language, or artist
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-lf-text-secondary hover:bg-lf-bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
            Key
          </h3>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => onKeyFilterChange("")}
              className={`min-h-10 rounded-[var(--lf-radius-md)] border px-2 text-sm font-medium transition-colors ${
                !keyFilter
                  ? "border-lf-brand bg-lf-bg-active text-lf-brand"
                  : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
              }`}
            >
              All
            </button>
            {ALL_KEYS.map((key) => {
              const isSelected = keyFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onKeyFilterChange(isSelected ? "" : key)}
                  className={`min-h-10 rounded-[var(--lf-radius-md)] border px-2 text-sm font-semibold transition-colors ${
                    isSelected
                      ? "border-lf-brand bg-lf-bg-active text-lf-brand"
                      : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
            Language
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onLanguageFilterChange("")}
              className={`min-h-9 rounded-[var(--lf-radius-md)] border px-3 text-sm font-medium transition-colors ${
                !languageFilter
                  ? "border-lf-brand bg-lf-bg-active text-lf-brand"
                  : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
              }`}
            >
              All
            </button>
            {LANGUAGE_TAGS.map((entry) => {
              const isSelected = languageFilter === entry.value;
              return (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() =>
                    onLanguageFilterChange(isSelected ? "" : entry.value)
                  }
                  className={`min-h-9 rounded-[var(--lf-radius-md)] border px-3 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-lf-brand bg-lf-bg-active text-lf-brand"
                      : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
                  }`}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
            Artist
          </h3>
          {artists.length === 0 ? (
            <p className="text-sm text-lf-text-secondary">
              No artists in the library yet. Add an artist when editing a song to filter by
              artist here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onArtistFilterChange("")}
                className={`min-h-9 rounded-[var(--lf-radius-md)] border px-3 text-sm font-medium transition-colors ${
                  !artistFilter
                    ? "border-lf-brand bg-lf-bg-active text-lf-brand"
                    : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
                }`}
              >
                All
              </button>
              {artists.map((name) => {
                const isSelected = artistFilter === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onArtistFilterChange(isSelected ? "" : name)}
                    className={`min-h-9 max-w-full truncate rounded-[var(--lf-radius-md)] border px-3 text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-lf-brand bg-lf-bg-active text-lf-brand"
                        : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="w-full min-h-11 rounded-[var(--lf-radius-md)] border border-lf-border text-sm font-medium text-lf-text-primary hover:bg-lf-bg-muted"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

export function libraryFilterLabel(
  keyFilter: Key | "",
  languageFilter: string,
  artistFilter: string,
): string {
  const parts: string[] = [];

  if (keyFilter) {
    parts.push(keyFilter);
  }

  if (languageFilter) {
    const label = languageLabel(languageFilter);
    if (label) {
      parts.push(label);
    }
  }

  if (artistFilter) {
    parts.push(artistFilter);
  }

  if (parts.length === 0) {
    return "Filter";
  }

  return `Filter · ${parts.join(" · ")}`;
}
