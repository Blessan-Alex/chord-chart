"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getRecentSongs,
  type RecentSongEntry,
} from "@/lib/recentSongs";

export function useRecentSongs(): {
  recentSongs: RecentSongEntry[];
  refreshRecentSongs: () => void;
} {
  const [recentSongs, setRecentSongs] = useState<RecentSongEntry[]>([]);

  const refreshRecentSongs = useCallback(() => {
    setRecentSongs(getRecentSongs());
  }, []);

  useEffect(() => {
    refreshRecentSongs();

    const handleFocus = () => {
      refreshRecentSongs();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshRecentSongs]);

  return { recentSongs, refreshRecentSongs };
}
