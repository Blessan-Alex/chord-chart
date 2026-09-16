"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { getDb, isFirebaseEnabled } from "@/lib/firebase";
import { firestoreSongToSong } from "@/lib/firestore/toSong";
import type { FirestoreSongData, Song } from "@/lib/types";

export type LiveSongPayload = {
  song: Song | null;
  artist: string;
  version: number | null;
};

const EMPTY_PAYLOAD: LiveSongPayload = {
  song: null,
  artist: "",
  version: null,
};

export function songLiveQueryKey(songId: string) {
  return ["song", songId] as const;
}

function mapSongDoc(
  songId: string,
  data: FirestoreSongData | undefined,
): LiveSongPayload {
  if (!data || data.status !== "active") {
    return EMPTY_PAYLOAD;
  }

  const firestoreSong = { id: songId, ...data };
  return {
    song: firestoreSongToSong(firestoreSong),
    artist: data.artist ?? "",
    version: data.version,
  };
}

export function useSongLive(songId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => songLiveQueryKey(songId), [songId]);
  const isActive = enabled && isFirebaseEnabled() && Boolean(songId);
  const [readyId, setReadyId] = useState<string | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isActive) {
      setReadyId(null);
      setSubscriptionError(null);
      return;
    }

    setReadyId(null);
    setSubscriptionError(null);
    queryClient.setQueryData(queryKey, EMPTY_PAYLOAD);

    const ref = doc(getDb(), "songs", songId);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setSubscriptionError(null);
        const payload = snapshot.exists()
          ? mapSongDoc(snapshot.id, snapshot.data() as FirestoreSongData)
          : EMPTY_PAYLOAD;
        queryClient.setQueryData(queryKey, payload);
        setReadyId(songId);
      },
      (error) => {
        setSubscriptionError(error);
        setReadyId(songId);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isActive, queryClient, queryKey, songId]);

  const songQuery = useQuery({
    queryKey,
    enabled: isActive,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    queryFn: async () =>
      queryClient.getQueryData<LiveSongPayload>(queryKey) ?? EMPTY_PAYLOAD,
  });

  const data = songQuery.data;

  return {
    song: data?.song ?? null,
    artist: data?.artist ?? "",
    version: data?.version ?? null,
    isLoading: isActive && readyId !== songId && !subscriptionError,
    error: subscriptionError ?? songQuery.error,
    isLive: isActive,
  };
}
