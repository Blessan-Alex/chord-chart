import type { Key } from "@/lib/engine";
import { artistMatchesFilter } from "@/lib/libraryArtists";
import type { SongIndexEntry } from "@/lib/types";

function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function scoreToken(entry: SongIndexEntry, token: string): number {
  const title = entry.title.toLowerCase();
  const artist = (entry.artist ?? "").toLowerCase();
  const searchText = (entry.searchText ?? "").toLowerCase();
  const tags = (entry.tags ?? []).map((tag) => tag.toLowerCase());
  const titleWords = title.split(/\s+/).filter(Boolean);

  if (title === token) {
    return 400;
  }
  if (title.startsWith(token)) {
    return 200;
  }
  if (titleWords.some((word) => word.startsWith(token))) {
    return 150;
  }
  if (title.includes(token)) {
    return 80;
  }
  if (artist.includes(token)) {
    return 60;
  }
  if (tags.some((tag) => tag.includes(token))) {
    return 40;
  }
  if (searchText.includes(token)) {
    return 30;
  }

  return 0;
}

function scoreEntry(entry: SongIndexEntry, tokens: string[]): number {
  if (tokens.length === 0) {
    return 0;
  }

  const fullQuery = tokens.join(" ");
  const title = entry.title.toLowerCase();
  const artist = (entry.artist ?? "").toLowerCase();
  const searchText = (entry.searchText ?? "").toLowerCase();
  const tags = (entry.tags ?? []).map((tag) => tag.toLowerCase());

  let score = 0;

  if (title === fullQuery) {
    score += 1000;
  } else if (title.startsWith(fullQuery)) {
    score += 500;
  } else if (title.includes(fullQuery)) {
    score += 300;
  }

  if (artist.startsWith(fullQuery)) {
    score += 200;
  } else if (artist.includes(fullQuery)) {
    score += 100;
  }

  if (searchText.includes(fullQuery)) {
    score += 50;
  }

  if (tags.some((tag) => tag.includes(fullQuery))) {
    score += 40;
  }

  for (const token of tokens) {
    const tokenScore = scoreToken(entry, token);
    if (tokenScore === 0) {
      return -1;
    }
    score += tokenScore;
  }

  return score;
}

function applyFilters(
  entries: SongIndexEntry[],
  keyFilter?: Key,
  tagFilter?: string,
  artistFilter?: string,
): SongIndexEntry[] {
  let results = entries;

  if (keyFilter) {
    results = results.filter((entry) => entry.key === keyFilter);
  }

  if (tagFilter) {
    results = results.filter((entry) => (entry.tags ?? []).includes(tagFilter));
  }

  if (artistFilter?.trim()) {
    results = results.filter((entry) =>
      artistMatchesFilter(entry.artist, artistFilter),
    );
  }

  return results;
}

export function rankSongIndexResults(
  entries: SongIndexEntry[],
  query: string,
  keyFilter?: Key,
  tagFilter?: string,
  artistFilter?: string,
): SongIndexEntry[] {
  const filtered = applyFilters(entries, keyFilter, tagFilter, artistFilter);
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }

  return filtered
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map(({ entry }) => entry);
}

export function entryMatchesQuery(entry: SongIndexEntry, query: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return true;
  }

  return scoreEntry(entry, tokens) >= 0;
}
