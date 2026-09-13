import type { Key } from "@/lib/engine";

export type RecentSongEntry = {
  songId: string;
  title: string;
  artist: string;
  key: Key;
  viewedAt: number;
};

const STORAGE_KEY = "lf-recent-songs";
const MAX_RECENT = 10;

export function getRecentSongs(): RecentSongEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as RecentSongEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry.songId === "string" &&
          typeof entry.title === "string" &&
          typeof entry.key === "string",
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function recordRecentSong(
  entry: Omit<RecentSongEntry, "viewedAt">,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized: RecentSongEntry = {
    songId: entry.songId,
    title: entry.title.trim() || "Untitled",
    artist: entry.artist?.trim() ?? "",
    key: entry.key,
    viewedAt: Date.now(),
  };

  const next = [
    normalized,
    ...getRecentSongs().filter((item) => item.songId !== normalized.songId),
  ].slice(0, MAX_RECENT);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
