import type { SongIndexEntry } from "@/lib/types";

/** Unique non-empty artist names from the library index, sorted A–Z. */
export function collectLibraryArtists(entries: SongIndexEntry[]): string[] {
  const byLowerCase = new Map<string, string>();

  for (const entry of entries) {
    const name = entry.artist?.trim();
    if (!name) {
      continue;
    }

    const key = name.toLowerCase();
    if (!byLowerCase.has(key)) {
      byLowerCase.set(key, name);
    }
  }

  return [...byLowerCase.values()].sort((a, b) => a.localeCompare(b));
}

export function artistMatchesFilter(
  entryArtist: string | undefined,
  filter: string,
): boolean {
  if (!filter.trim()) {
    return true;
  }

  return (
    (entryArtist ?? "").trim().toLowerCase() === filter.trim().toLowerCase()
  );
}

export function isArtistFilterValid(filter: string, availableArtists: string[]): boolean {
  if (!filter.trim()) {
    return true;
  }

  return availableArtists.some((name) => artistMatchesFilter(name, filter));
}
