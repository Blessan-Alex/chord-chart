import type { Song } from "@/lib/types";
import { validateSong } from "@/lib/validation";

const STORAGE_KEY = "lf-chord-app-songs";

function isClient(): boolean {
  return typeof window !== "undefined";
}

function isSongShape(value: unknown): value is Song {
  if (!value || typeof value !== "object") {
    return false;
  }

  const obj = value as Record<string, unknown>;
  if (typeof obj.id !== "string") {
    return false;
  }
  if (typeof obj.title !== "string") {
    return false;
  }
  if (typeof obj.originalKey !== "string") {
    return false;
  }
  if (!Array.isArray(obj.sections)) {
    return false;
  }

  return true;
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

    return parsed.filter(isSongShape);
  } catch {
    return [];
  }
}

function writeSongs(songs: Song[]): void {
  if (!isClient()) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  } catch (error) {
    const isQuota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.code === 22);
    if (isQuota) {
      throw new Error(
        "Storage is full. Delete some songs or free up browser storage space.",
      );
    }
    throw error;
  }
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

function findExistingSongIndex(songs: Song[], song: Song): number {
  if (!song.id) {
    return -1;
  }

  return songs.findIndex((entry) => entry.id === song.id);
}

export function saveSong(song: Song): Song {
  const validation = validateSong(song);
  if (!validation.ok) {
    throw new Error(validation.errors[0]);
  }

  const songs = getSongs();
  const existingIndex = findExistingSongIndex(songs, song);

  const savedSong: Song = {
    ...song,
    id:
      existingIndex >= 0
        ? songs[existingIndex].id
        : song.id || createSongId(),
  };

  if (existingIndex >= 0) {
    songs[existingIndex] = savedSong;
  } else {
    songs.push(savedSong);
  }

  writeSongs(songs);
  return savedSong;
}

export function deleteSong(id: string): void {
  const songs = getSongs();
  const filtered = songs.filter((song) => song.id !== id);
  writeSongs(filtered);
}
