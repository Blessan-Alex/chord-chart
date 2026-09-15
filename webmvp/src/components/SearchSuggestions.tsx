"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SongIndexEntry } from "@/lib/types";

type SearchSuggestionsProps = {
  open: boolean;
  results: SongIndexEntry[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (entry: SongIndexEntry) => void;
  onClose: () => void;
};

export function SearchSuggestions({
  open,
  results,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  onClose,
}: SearchSuggestionsProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open || activeIndex < 0) {
      return;
    }

    const item = listRef.current?.children.item(activeIndex);
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open || results.length === 0) {
    return null;
  }

  return (
    <ul
      ref={listRef}
      id="search-suggestions"
      role="listbox"
      aria-label="Search suggestions"
      className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated py-1 shadow-lg"
    >
      {results.map((entry, index) => {
        const isActive = index === activeIndex;
        return (
          <li key={entry.id} role="presentation">
            <Link
              href={`/song/${entry.id}`}
              role="option"
              aria-selected={isActive}
              className={`flex min-h-12 items-center gap-3 px-4 py-2 transition-colors ${
                isActive ? "bg-lf-bg-active" : "hover:bg-lf-bg-muted"
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={(event) => {
                event.preventDefault();
                onSelect(entry);
                onClose();
              }}
              onMouseEnter={() => onActiveIndexChange(index)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-lf-text-primary">
                  {entry.title}
                </p>
                {entry.artist ? (
                  <p className="truncate text-xs text-lf-text-secondary">
                    {entry.artist}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full bg-lf-bg-active px-2 py-0.5 text-xs font-semibold text-lf-brand">
                {entry.key}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function useSearchSuggestionsKeyboard({
  open,
  resultCount,
  activeIndex,
  onActiveIndexChange,
  onSelectFirst,
  onClose,
}: {
  open: boolean;
  resultCount: number;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelectFirst: () => void;
  onClose: () => void;
}) {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || resultCount === 0) {
        if (event.key === "Escape") {
          onClose();
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        onActiveIndexChange(
          activeIndex < resultCount - 1 ? activeIndex + 1 : 0,
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        onActiveIndexChange(
          activeIndex > 0 ? activeIndex - 1 : resultCount - 1,
        );
        return;
      }

      if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        onSelectFirst();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [activeIndex, onActiveIndexChange, onClose, onSelectFirst, open, resultCount],
  );

  return handleKeyDown;
}

export function useSearchSuggestionsState(query: string, resultCount: number) {
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    setDismissed(false);
  }, [query]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (resultCount === 0) {
        return 0;
      }
      return Math.min(current, resultCount - 1);
    });
  }, [resultCount]);

  const open =
    focused && query.trim().length >= 1 && !dismissed;

  const close = useCallback(() => {
    setFocused(false);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setFocused(false);
  }, []);

  const focus = useCallback(() => {
    setFocused(true);
    setDismissed(false);
  }, []);

  return {
    focused,
    setFocused: focus,
    activeIndex,
    setActiveIndex,
    open,
    close,
    dismiss,
  };
}
