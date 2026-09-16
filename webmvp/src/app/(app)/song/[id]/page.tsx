"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AddToPlaylistModal } from "@/components/AddToPlaylistModal";
import { AutoscrollBar } from "@/components/AutoscrollBar";
import { ChordChartViewport } from "@/components/ChordChartViewport";
import { ChordLine } from "@/components/ChordLine";
import { KeySelectModal } from "@/components/KeySelectModal";
import { PageLoading } from "@/components/PageLoading";
import { PerformanceBottomBar } from "@/components/PerformanceBottomBar";
import { PerformanceFullscreen } from "@/components/PerformanceFullscreen";
import { SongControlBar } from "@/components/SongControlBar";
import { SongHeader } from "@/components/SongHeader";
import { type Key } from "@/lib/engine";
import {
  getDraftForSong,
  listArchivedVersions,
} from "@/lib/firestore/songEdits";
import { listSessionSongs } from "@/lib/firestore/sessionSongs";
import { getSession } from "@/lib/firestore/sessions";
import { useAutoscroll } from "@/lib/hooks/useAutoscroll";
import { useSongLive } from "@/lib/hooks/useSongLive";
import { useChartZoom } from "@/lib/hooks/useChartZoom";
import { useChartLayout } from "@/lib/hooks/useChartLayout";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { usePerformanceFullscreen } from "@/lib/hooks/usePerformanceFullscreen";
import { usePerformanceMode } from "@/lib/hooks/usePerformanceMode";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useAuth } from "@/lib/hooks/useAuth";
import { isKey, transposeKeyBy } from "@/lib/keyUtils";
import {
  type ChartTheme,
  resolveChartTheme,
  writeChartTheme,
  writeLastSessionIndex,
} from "@/lib/performancePreferences";
import {
  buildAdjacentSongHref,
  canonicalPlaylistSearchParams,
  parseSessionNavParams,
} from "@/lib/sessionNavigation";
import { recordRecentSong } from "@/lib/recentSongs";
import { isFirebaseEnabled } from "@/lib/firebase";
import { getSong as getLocalSong } from "@/lib/storage";
import type { Session, SessionSong, Song, SongEdit, SongViewMode } from "@/lib/types";

const THEME_CYCLE: ChartTheme[] = ["system", "dark", "stage"];

export default function SongPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const keyParam = searchParams.get("key");
  const { sessionId, index: sessionIndex } = parseSessionNavParams(searchParams);
  const { user, loading: authLoading, isAdmin } = useAuth();

  const [localSong, setLocalSong] = useState<Song | null>(null);
  const [localResolved, setLocalResolved] = useState(false);
  const useFirestore = isFirebaseEnabled() && !authLoading;
  const liveSong = useSongLive(id, useFirestore);
  const song = liveSong.song ?? localSong;
  const artist = liveSong.song ? liveSong.artist : "";
  const version = liveSong.song ? liveSong.version : null;
  const loaded =
    !authLoading && (useFirestore ? !liveSong.isLoading && localResolved : localResolved);
  const [targetKey, setTargetKey] = useState<string>("C");
  const [viewMode, setViewMode] = useState<SongViewMode>("chords");
  const [showAddToSession, setShowAddToSession] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [draft, setDraft] = useState<SongEdit | null>(null);
  const [archives, setArchives] = useState<SongEdit[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionSongs, setSessionSongs] = useState<SessionSong[]>([]);
  const [chartTheme, setChartTheme] = useState<ChartTheme>("system");
  const [transposeFlash, setTransposeFlash] = useState<Key | null>(null);

  const swipeStartX = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const recordedRecentRef = useRef<string | null>(null);
  const isMobile = useIsMobile();
  const performanceMode = usePerformanceMode(sessionId);
  const zoom = useChartZoom({ sessionId });
  const { containerRef, maxChars } = useChartLayout(zoom.scale, performanceMode);
  const autoscroll = useAutoscroll(scrollContainerRef);
  const fullscreen = usePerformanceFullscreen();
  const wakeLock = useWakeLock(fullscreen.active || autoscroll.active);

  const toggleAutoscroll = useCallback(() => {
    if (autoscroll.active) {
      autoscroll.stop();
    } else {
      autoscroll.start();
    }
  }, [autoscroll]);

  const toggleFullscreen = useCallback(() => {
    void fullscreen.toggle();
  }, [fullscreen]);

  useEffect(() => {
    const canonical = canonicalPlaylistSearchParams(searchParams);
    if (canonical) {
      router.replace(`/song/${id}?${canonical.toString()}`);
    }
  }, [id, router, searchParams]);

  useEffect(() => {
    setChartTheme(resolveChartTheme(sessionId));
  }, [sessionId]);

  useEffect(() => {
    if (!performanceMode) {
      document.documentElement.classList.remove("song-performance-page");
      document.body.classList.remove("song-performance-page");
      return;
    }
    document.documentElement.classList.add("song-performance-page");
    document.body.classList.add("song-performance-page");
    return () => {
      document.documentElement.classList.remove("song-performance-page");
      document.body.classList.remove("song-performance-page");
    };
  }, [performanceMode]);

  useEffect(() => {
    recordedRecentRef.current = null;
  }, [id]);

  useEffect(() => {
    if (autoscroll.active) {
      document.documentElement.classList.add("song-autoscroll-active");
    } else {
      document.documentElement.classList.remove("song-autoscroll-active");
    }
    return () => {
      document.documentElement.classList.remove("song-autoscroll-active");
    };
  }, [autoscroll.active]);

  useEffect(() => {
    if (!loaded || !song) {
      return;
    }
    if (recordedRecentRef.current === song.id) {
      return;
    }
    recordedRecentRef.current = song.id;
    recordRecentSong({
      songId: song.id,
      title: song.title,
      artist,
      key: song.originalKey,
    });
  }, [loaded, song, artist]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!useFirestore) {
      const found = getLocalSong(id);
      setLocalSong(found ?? null);
      setLocalResolved(true);
      return;
    }

    if (liveSong.isLoading) {
      setLocalResolved(false);
      return;
    }

    if (!liveSong.song && !user) {
      setLocalSong(getLocalSong(id) ?? null);
    } else {
      setLocalSong(null);
    }
    setLocalResolved(true);
  }, [authLoading, useFirestore, id, liveSong.isLoading, liveSong.song, user]);

  useEffect(() => {
    if (!loaded || !song) {
      return;
    }
    if (keyParam && isKey(keyParam)) {
      setTargetKey(keyParam);
    } else if (isKey(song.originalKey)) {
      setTargetKey(song.originalKey);
    }
  }, [loaded, song?.id, song?.originalKey, keyParam]);

  useEffect(() => {
    if (!user || !isAdmin || !id || !loaded || !useFirestore) {
      if (!user || !isAdmin) {
        setDraft(null);
        setArchives([]);
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      const [openDraft, versions] = await Promise.all([
        getDraftForSong(id),
        listArchivedVersions(id),
      ]);
      if (!cancelled) {
        setDraft(openDraft);
        setArchives(versions);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, id, loaded, useFirestore, liveSong.version]);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setSessionSongs([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const [nextSession, nextSongs] = await Promise.all([
          getSession(sessionId),
          listSessionSongs(sessionId),
        ]);
        if (!cancelled) {
          setSession(nextSession);
          setSessionSongs(nextSongs);
          if (sessionIndex !== null) {
            writeLastSessionIndex(sessionId, sessionIndex);
          }
        }
      } catch {
        if (!cancelled) {
          setSession(null);
          setSessionSongs([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, sessionIndex]);

  const handleTranspose = useCallback((direction: -1 | 1) => {
    setTargetKey((current) => {
      if (!isKey(current)) {
        return current;
      }
      const next = transposeKeyBy(current, direction);
      setTransposeFlash(next);
      window.setTimeout(() => setTransposeFlash(null), 900);
      return next;
    });
  }, []);

  const handlePinchScale = useCallback(
    (next: number) => {
      zoom.setScaleLive(next);
    },
    [zoom],
  );

  const handlePinchEnd = useCallback(() => {
    zoom.commitScale();
  }, [zoom]);

  const handleToggleTheme = useCallback(() => {
    setChartTheme((current) => {
      const idx = THEME_CYCLE.indexOf(current);
      const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
      writeChartTheme(next);
      return next;
    });
  }, []);

  const navigateSwipe = useCallback(
    (direction: -1 | 1) => {
      if (!sessionId || sessionIndex === null) {
        return;
      }
      const href = buildAdjacentSongHref(
        sessionId,
        sessionSongs,
        sessionIndex,
        direction,
      );
      if (href) {
        router.push(href);
      }
    },
    [router, sessionId, sessionIndex, sessionSongs],
  );

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    swipeStartX.current = event.touches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (swipeStartX.current === null || !sessionId || sessionIndex === null) {
        return;
      }
      const endX = event.changedTouches[0]?.clientX;
      if (endX === undefined) {
        return;
      }
      const delta = endX - swipeStartX.current;
      swipeStartX.current = null;
      if (Math.abs(delta) < 72) {
        return;
      }
      navigateSwipe(delta > 0 ? -1 : 1);
    },
    [navigateSwipe, sessionId, sessionIndex],
  );

  if (!loaded || authLoading) {
    return <PageLoading />;
  }

  if (!song) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4 sm:p-8">
        <h1 className="text-2xl font-semibold">Song not found</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {user
            ? "No song matches this link."
            : "Sign in to view shared songs, or open a song saved on this device."}
        </p>
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          ← Home
        </Link>
      </main>
    );
  }

  const originalKey = song.originalKey;
  const currentKey = isKey(targetKey) ? targetKey : originalKey;
  const prevHref =
    sessionId && sessionIndex !== null
      ? buildAdjacentSongHref(sessionId, sessionSongs, sessionIndex, -1)
      : null;
  const nextHref =
    sessionId && sessionIndex !== null
      ? buildAdjacentSongHref(sessionId, sessionSongs, sessionIndex, 1)
      : null;
  const sessionPosition =
    sessionIndex !== null && sessionSongs.length > 0
      ? `${sessionIndex + 1}/${sessionSongs.length}`
      : null;

  const immersive = autoscroll.active || fullscreen.active;
  const bottomPadding = isMobile && !immersive ? "pb-28 sm:pb-32" : "pb-8";
  const backHref = sessionId ? `/playlists/${sessionId}` : "/";
  const backLabel = sessionId ? "Back to playlist" : "Back to home";

  return (
    <main
      className={`song-page--landscape mx-auto flex w-full flex-col p-4 sm:p-8 ${bottomPadding} ${
        performanceMode ? "song-page--performance" : ""
      } ${
        immersive
          ? "fixed inset-0 z-[60] h-[100dvh] max-w-none overflow-hidden bg-lf-bg-page"
          : "min-h-0 max-w-2xl flex-1"
      }`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {user && (
        <AddToPlaylistModal
          open={showAddToSession}
          songId={id}
          songTitle={song.title}
          onClose={() => setShowAddToSession(false)}
        />
      )}

      {!fullscreen.active && (
        <SongHeader
          title={song.title}
          artist={artist}
          backHref={backHref}
          backLabel={backLabel}
          compact={isMobile || performanceMode}
        />
      )}

      {!fullscreen.active && version !== null && isAdmin && (
        <p className="text-xs text-lf-text-tertiary">Library version {version}</p>
      )}

      {!(isMobile && autoscroll.active) && !fullscreen.active && (
        <SongControlBar
          targetKey={currentKey}
          originalKey={originalKey}
          viewMode={viewMode}
          transposeFlash={transposeFlash}
          showMobileControls={isMobile}
          onTransposeDown={() => handleTranspose(-1)}
          onTransposeUp={() => handleTranspose(1)}
          onOpenKeyModal={() => setShowKeyModal(true)}
          onViewModeChange={setViewMode}
          onZoomOut={zoom.zoomOut}
          onZoomIn={zoom.zoomIn}
          autoscrollActive={autoscroll.active}
          onToggleAutoscroll={toggleAutoscroll}
          fullscreenActive={fullscreen.active}
          onToggleFullscreen={toggleFullscreen}
          showAddToPlaylist={Boolean(user)}
          onAddToPlaylist={() => setShowAddToSession(true)}
          shareSong={{ id: song.id, title: song.title }}
        />
      )}

      <KeySelectModal
        open={showKeyModal}
        originalKey={originalKey}
        selectedKey={currentKey}
        onSelect={(key) => setTargetKey(key)}
        onClose={() => setShowKeyModal(false)}
      />

      {autoscroll.active && (
        <AutoscrollBar
          speed={autoscroll.speed}
          paused={autoscroll.paused}
          onDecrease={autoscroll.decreaseSpeed}
          onIncrease={autoscroll.increaseSpeed}
          onTogglePause={() => {
            if (autoscroll.paused) {
              autoscroll.resume();
            } else {
              autoscroll.pause();
            }
          }}
          onClose={autoscroll.stop}
        />
      )}

      {!performanceMode && !fullscreen.active && draft && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Draft in progress.{" "}
          <Link href={`/song/${id}/edit`} className="font-medium underline">
            Continue editing
          </Link>
        </p>
      )}

      <div
        ref={scrollContainerRef}
        className={`min-w-0 flex-1 ${
          autoscroll.active
            ? "min-h-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] pb-24"
            : fullscreen.active
              ? "min-h-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] pb-24"
              : ""
        }`}
      >
        <ChordChartViewport
          scale={zoom.scale}
          scalePercent={zoom.scalePercent}
          showIndicator={zoom.showIndicator}
          containerRef={containerRef}
          onPinchScale={handlePinchScale}
          onPinchEnd={handlePinchEnd}
          onDoubleTap={zoom.toggleZoomPreset}
          gesturesEnabled={!autoscroll.active}
          className="mt-2 min-w-0 sm:mt-4"
        >
          <div className="chord-chart" data-chart-theme={chartTheme}>
            {song.sections.map((section, si) => (
              <div key={`${section.label}-${si}`}>
                <div className="section-label">{section.label}</div>
                {section.lines.map((line, li) => (
                  <ChordLine
                    key={`${si}-${li}`}
                    line={line}
                    originalKey={originalKey}
                    targetKey={targetKey}
                    viewMode={viewMode}
                    wrapEnabled={performanceMode}
                    maxChars={maxChars}
                  />
                ))}
              </div>
            ))}
          </div>
        </ChordChartViewport>
      </div>

      {fullscreen.active && (
        <PerformanceFullscreen
          onExit={() => {
            void fullscreen.exit();
          }}
          nextHref={nextHref}
          sessionPosition={sessionPosition}
          onZoomIn={zoom.zoomIn}
          onZoomOut={zoom.zoomOut}
          wakeLockSupported={wakeLock.supported}
        />
      )}

      {isMobile && !autoscroll.active && !fullscreen.active && (
        <PerformanceBottomBar
          targetKey={currentKey}
          onOpenKeyModal={() => setShowKeyModal(true)}
          onZoomOut={zoom.zoomOut}
          onZoomIn={zoom.zoomIn}
          chartTheme={chartTheme}
          onToggleTheme={handleToggleTheme}
          transposeFlash={transposeFlash}
          sessionLabel={session?.title ?? null}
          sessionPosition={sessionPosition}
          prevHref={prevHref}
          nextHref={nextHref}
          sessionBackHref={sessionId ? `/playlists/${sessionId}` : null}
          autoscrollActive={autoscroll.active}
          onToggleAutoscroll={toggleAutoscroll}
          fullscreenActive={fullscreen.active}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {!fullscreen.active && user && isAdmin && archives.length > 0 && (
        <section className="mt-8 border-t border-lf-border pt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-lf-text-tertiary">
            Version history
          </h2>
          <ul className="divide-y divide-lf-border overflow-hidden rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated">
            {archives.map((archive) => (
              <li
                key={archive.id}
                className="flex items-center justify-between px-4 py-3 text-sm text-lf-text-primary"
              >
                <span>
                  v{archive.version} · {archive.title}
                </span>
                <span className="text-lf-text-secondary">
                  {archive.publishedAt
                    ? archive.publishedAt.toDate().toLocaleDateString()
                    : archive.createdAt.toDate().toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
