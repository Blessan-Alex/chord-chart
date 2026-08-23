import type { Song } from "@/lib/types";

const STORAGE_KEY = "lf-chord-app-songs";

function isClient(): boolean {
  return typeof window !== "undefined";
}

function readSongs(): Song[] {
  if (!isClient()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as Song[];
  } catch {
    return [];
  }
}

function writeSongs(songs: Song[]): void {
  if (!isClient()) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

function createSongId(): string {
  if (isClient() && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getSongs(): Song[] {
  return readSongs();
}

export function getSong(id: string): Song | undefined {
  return getSongs().find((song) => song.id === id);
}

export function saveSong(song: Song): Song {
  const songs = getSongs();
  const savedSong: Song = {
    ...song,
    id: song.id || createSongId(),
  };

  const existingIndex = songs.findIndex((entry) => entry.id === savedSong.id);

  if (existingIndex >= 0) {
    songs[existingIndex] = savedSong;
  } else {
    songs.push(savedSong);
  }

  writeSongs(songs);
  return savedSong;
}
