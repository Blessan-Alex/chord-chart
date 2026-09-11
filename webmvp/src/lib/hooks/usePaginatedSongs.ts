"use client";

import type { QueryDocumentSnapshot } from "firebase/firestore";
import { useCallback, useState } from "react";

import type { Key } from "@/lib/engine";
import { listSongs } from "@/lib/firestore/songs";
import type { FirestoreSong } from "@/lib/types";

type UsePaginatedSongsOptions = {
  pageSize?: number;
  originalKey?: Key;
};

export function usePaginatedSongs(options: UsePaginatedSongsOptions = {}) {
  const pageSize = options.pageSize ?? 20;
  const [songs, setSongs] = useState<FirestoreSong[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await listSongs({
        status: "active",
        originalKey: options.originalKey,
        pageSize,
        startAfterDoc: initialized ? lastDoc ?? undefined : undefined,
      });

      setSongs((prev) => {
        const seen = new Set(prev.map((song) => song.id));
        const next = result.songs.filter((song) => !seen.has(song.id));
        return [...prev, ...next];
      });
      setLastDoc(result.lastDoc);
      setHasMore(result.songs.length === pageSize);
      setInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load songs.");
    } finally {
      setLoading(false);
    }
  }, [
    hasMore,
    initialized,
    lastDoc,
    loading,
    options.originalKey,
    pageSize,
  ]);

  const reset = useCallback(() => {
    setSongs([]);
    setLastDoc(null);
    setHasMore(true);
    setInitialized(false);
    setError(null);
  }, []);

  return {
    songs,
    loading,
    error,
    hasMore,
    initialized,
    loadMore,
    reset,
  };
}
