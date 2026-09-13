import type { SessionSong } from "@/lib/types";

const PLAYLIST_PARAM = "playlist";
const LEGACY_SESSION_PARAM = "session";

export function sessionSongHref(
  sessionId: string,
  entry: SessionSong,
  index: number,
): string {
  const params = new URLSearchParams({
    [PLAYLIST_PARAM]: sessionId,
    index: String(index),
  });
  if (entry.keyOverride) {
    params.set("key", entry.keyOverride);
  }
  return `/song/${entry.songId}?${params.toString()}`;
}

/** @deprecated Use sessionSongHref — kept for callers migrating gradually. */
export function legacySessionSongHref(
  sessionId: string,
  entry: SessionSong,
  index: number,
): string {
  const params = new URLSearchParams({
    [LEGACY_SESSION_PARAM]: sessionId,
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
  const sessionId =
    searchParams.get(PLAYLIST_PARAM) ?? searchParams.get(LEGACY_SESSION_PARAM);
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

export function canonicalPlaylistSearchParams(
  searchParams: URLSearchParams,
): URLSearchParams | null {
  const legacySession = searchParams.get(LEGACY_SESSION_PARAM);
  if (!legacySession || searchParams.get(PLAYLIST_PARAM)) {
    return null;
  }

  const params = new URLSearchParams(searchParams.toString());
  params.delete(LEGACY_SESSION_PARAM);
  params.set(PLAYLIST_PARAM, legacySession);
  return params;
}
