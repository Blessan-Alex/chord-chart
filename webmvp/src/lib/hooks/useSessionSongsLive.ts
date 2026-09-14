"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";

import { addSongToSession } from "@/lib/firestore/sessionSongs";
import { getDb } from "@/lib/firebase";
import type { SessionSong, SessionSongData, SongIndexEntry } from "@/lib/types";

function mapSessionSong(snap: QueryDocumentSnapshot): SessionSong {
  return { id: snap.id, ...(snap.data() as SessionSongData) };
}

export function sessionSongsQueryKey(sessionId: string) {
  return ["sessionSongs", sessionId] as const;
}

export function useSessionSongsLive(sessionId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => sessionSongsQueryKey(sessionId), [sessionId]);
  const isActive = enabled && Boolean(sessionId);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isActive) {
      setHasSnapshot(false);
      setSubscriptionError(null);
      return;
    }

    setHasSnapshot(false);
    setSubscriptionError(null);

    const songsQuery = query(
      collection(getDb(), "sessions", sessionId, "sessionSongs"),
      orderBy("order", "asc"),
    );

    const unsubscribe = onSnapshot(
      songsQuery,
      (snapshot) => {
        setHasSnapshot(true);
        setSubscriptionError(null);
        queryClient.setQueryData(
          queryKey,
          snapshot.docs.map(mapSessionSong),
        );
      },
      (error) => {
        setHasSnapshot(true);
        setSubscriptionError(error);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isActive, queryClient, queryKey, sessionId]);

  const songsQuery = useQuery({
    queryKey,
    enabled: isActive,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    queryFn: async () => queryClient.getQueryData<SessionSong[]>(queryKey) ?? [],
  });

  const addSongOptimistic = useCallback(
    async (entry: SongIndexEntry, addedBy: string) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<SessionSong[]>(queryKey) ?? [];
      const maxOrder = previous.reduce(
        (max, song) => Math.max(max, song.order),
        0,
      );
      const optimisticId = `optimistic-${entry.id}-${Date.now()}`;
      const optimisticSong: SessionSong = {
        id: optimisticId,
        songId: entry.id,
        songTitle: entry.title,
        order: maxOrder + 1000,
        keyOverride: null,
        notes: null,
        addedBy,
        addedAt: Timestamp.now(),
      };

      queryClient.setQueryData<SessionSong[]>(queryKey, [
        ...previous,
        optimisticSong,
      ]);

      try {
        await addSongToSession(sessionId, entry.id, entry.title, addedBy);
        queryClient.setQueryData<SessionSong[]>(queryKey, (current) =>
          (current ?? []).filter((song) => song.id !== optimisticId),
        );
      } catch (error) {
        queryClient.setQueryData(queryKey, previous);
        throw error;
      }
    },
    [queryClient, queryKey, sessionId],
  );

  return {
    songs: songsQuery.data ?? [],
    isLoading: isActive && !hasSnapshot && !subscriptionError,
    error: subscriptionError ?? songsQuery.error,
    addSongOptimistic,
  };
}
