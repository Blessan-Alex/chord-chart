"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getRecentSongs,
  RECENT_SONGS_STORAGE_KEY,
  type RecentSongEntry,
} from "@/lib/recentSongs";

export function useRecentSongs(): { recentSongs: RecentSongEntry[] } {
  const [recentSongs, setRecentSongs] = useState<RecentSongEntry[]>([]);

  const refreshRecentSongs = useCallback(() => {
    setRecentSongs(getRecentSongs());
  }, []);

  useEffect(() => {
    refreshRecentSongs();

    const handleFocus = () => {
      refreshRecentSongs();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === RECENT_SONGS_STORAGE_KEY || event.key === null) {
        refreshRecentSongs();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshRecentSongs]);

  return { recentSongs };
}
