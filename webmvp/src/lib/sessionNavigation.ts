import type { SessionSong } from "@/lib/types";

export function sessionSongHref(
  sessionId: string,
  entry: SessionSong,
  index: number,
): string {
  const params = new URLSearchParams({
    session: sessionId,
    index: String(index),
  });
  if (entry.keyOverride) {
    params.set("key", entry.keyOverride);
  }
  return `/song/${entry.songId}?${params.toString()}`;
}

export function startSetHref(
  sessionId: string,
  songs: SessionSong[],
): string | null {
  if (songs.length === 0) {
    return null;
  }
  return sessionSongHref(sessionId, songs[0], 0);
}

export function parseSessionNavParams(searchParams: URLSearchParams): {
  sessionId: string | null;
  index: number | null;
} {
  const sessionId = searchParams.get("session");
  const indexRaw = searchParams.get("index");
  if (!sessionId || indexRaw === null) {
    return { sessionId: null, index: null };
  }
  const index = Number.parseInt(indexRaw, 10);
  if (Number.isNaN(index) || index < 0) {
    return { sessionId, index: null };
  }
  return { sessionId, index };
}

export function buildAdjacentSongHref(
  sessionId: string,
  songs: SessionSong[],
  currentIndex: number,
  direction: -1 | 1,
): string | null {
  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= songs.length) {
    return null;
  }
  return sessionSongHref(sessionId, songs[nextIndex], nextIndex);
}
