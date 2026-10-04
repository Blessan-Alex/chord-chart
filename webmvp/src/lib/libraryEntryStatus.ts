import type { SongIndexEntry, SongStatus } from "@/lib/types";

export function entryStatus(entry: SongIndexEntry): SongStatus {
  return entry.status ?? "active";
}

export function isMusicianLibraryEntry(entry: SongIndexEntry): boolean {
  return entryStatus(entry) === "active";
}
