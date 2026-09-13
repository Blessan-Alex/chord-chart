"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AddToSessionModal } from "@/components/AddToSessionModal";
import { AutoscrollBar } from "@/components/AutoscrollBar";
import { ChordChartViewport } from "@/components/ChordChartViewport";
import { ChordLine } from "@/components/ChordLine";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { KeySelectModal } from "@/components/KeySelectModal";
import { PageLoading } from "@/components/PageLoading";
import { PerformanceBottomBar } from "@/components/PerformanceBottomBar";
import { SongControlBar } from "@/components/SongControlBar";
import { SongHeader } from "@/components/SongHeader";
import { type SongViewMode } from "@/components/SongToolbar";
import { type Key } from "@/lib/engine";
import { formatError } from "@/lib/formatError";
import { firestoreSongToSong } from "@/lib/firestore/toSong";
import {
  createDraft,
  getDraftForSong,
  listArchivedVersions,
} from "@/lib/firestore/songEdits";
import { listSessionSongs } from "@/lib/firestore/sessionSongs";
import { getSession } from "@/lib/firestore/sessions";
import { archiveSong, getSong as getFirestoreSong } from "@/lib/firestore/songs";
import { useAutoscroll } from "@/lib/hooks/useAutoscroll";
import { useChartZoom } from "@/lib/hooks/useChartZoom";
import { useChartLayout } from "@/lib/hooks/useChartLayout";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { usePerformanceMode } from "@/lib/hooks/usePerformanceMode";
import { useAuth } from "@/lib/hooks/useAuth";
import { isKey, transposeKeyBy } from "@/lib/keyUtils";
import {
  type ChartTheme,
  readChartTheme,
  writeChartTheme,
  writeLastSessionIndex,
} from "@/lib/performancePreferences";
import {
  buildAdjacentSongHref,
  canonicalPlaylistSearchParams,
  parseSessionNavParams,
} from "@/lib/sessionNavigation";
import { recordRecentSong } from "@/lib/recentSongs";
import { getSong as getLocalSong } from "@/lib/storage";
import type { Session, SessionSong, Song, SongEdit } from "@/lib/types";

const THEME_CYCLE: ChartTheme[] = ["system", "dark", "stage"];

export default function SongPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const keyParam = searchParams.get("key");
  const { sessionId, index: sessionIndex } = parseSessionNavParams(searchParams);
  const { user, loading: authLoading, isAdmin } = useAuth();

  const [song, setSong] = useState<Song | null>(null);
  const [artist, setArtist] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [targetKey, setTargetKey] = useState<string>("C");
  const [viewMode, setViewMode] = useState<SongViewMode>("chords");
  const [showDelete, setShowDelete] = useState(false);
  const [showAddToSession, setShowAddToSession] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [draft, setDraft] = useState<SongEdit | null>(null);
  const [archives, setArchives] = useState<SongEdit[]>([]);
  const [editBusy, setEditBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionSongs, setSessionSongs] = useState<SessionSong[]>([]);
  const [chartTheme, setChartTheme] = useState<ChartTheme>("system");
  const [transposeFlash, setTransposeFlash] = useState<Key | null>(null);

  const swipeStartX = useRef<number | null>(null);
  const isMobile = useIsMobile();
  const performanceMode = usePerformanceMode(sessionId);
  const zoom = useChartZoom({ sessionId });
  const { containerRef, maxChars } = useChartLayout(zoom.scale, performanceMode);
  const autoscroll = useAutoscroll();

  useEffect(() => {
    const canonical = canonicalPlaylistSearchParams(searchParams);
    if (canonical) {
      router.replace(`/song/${id}?${canonical.toString()}`);
    }
  }, [id, router, searchParams]);

  useEffect(() => {
    setChartTheme(readChartTheme());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (chartTheme === "system") {
      root.removeAttribute("data-chart-theme");
    } else {
      root.dataset.chartTheme = chartTheme;
    }
    return () => {
      root.removeAttribute("data-chart-theme");
    };
  }, [chartTheme]);

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
    let cancelled = false;

    async function loadSong() {
      setLoaded(false);
      setDeleteError(null);

      if (user) {
        try {
          const firestoreSong = await getFirestoreSong(id);
          if (!cancelled) {
            if (firestoreSong) {
              const found = firestoreSongToSong(firestoreSong);
              setSong(found);
              setArtist(firestoreSong.artist ?? "");
              recordRecentSong({
                songId: found.id,
                title: found.title,
                artist: firestoreSong.artist ?? "",
                key: found.originalKey,
              });
              setVersion(firestoreSong.version);
              if (keyParam && isKey(keyParam)) {
                setTargetKey(keyParam);
              } else if (isKey(found.originalKey)) {
                setTargetKey(found.originalKey);
              }
              if (isAdmin) {
                const [openDraft, versions] = await Promise.all([
                  getDraftForSong(id),
                  listArchivedVersions(id),
                ]);
                if (!cancelled) {
                  setDraft(openDraft);
                  setArchives(versions);
                }
              }
            } else {
              setSong(null);
              setArtist("");
              setVersion(null);
              setDraft(null);
              setArchives([]);
            }
            setLoaded(true);
          }
          return;
        } catch {
          if (!cancelled) {
            setSong(null);
            setLoaded(true);
          }
          return;
        }
      }

      const found = getLocalSong(id);
      if (!cancelled) {
        setSong(found ?? null);
        setArtist("");
        if (found) {
          recordRecentSong({
            songId: found.id,
            title: found.title,
            artist: "",
            key: found.originalKey,
          });
          if (keyParam && isKey(keyParam)) {
            setTargetKey(keyParam);
          } else if (isKey(found.originalKey)) {
            setTargetKey(found.originalKey);
          }
        }
        setLoaded(true);
      }
    }

    if (!authLoading) {
      void loadSong();
    }

    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading, keyParam, isAdmin]);

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

  const handleEdit = async () => {
    if (!user || !isAdmin) {
      return;
    }

    setEditBusy(true);
    try {
      if (!draft) {
        await createDraft(id, user.uid);
      }
      router.push(`/song/${id}/edit`);
    } catch (error) {
      setDeleteError(formatError(error));
      setEditBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!song || !user || !isAdmin) {
      return;
    }

    setDeleteError(null);
    try {
      await archiveSong(id);
      router.push("/");
    } catch (error) {
      setDeleteError(formatError(error));
      setShowDelete(false);
    }
  };

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

  const bottomPadding =
    (isMobile && !autoscroll.active) || autoscroll.active
      ? "pb-28 sm:pb-32"
      : "pb-8";
  const backHref = sessionId ? `/sessions/${sessionId}` : "/";
  const backLabel = sessionId ? "Back to playlist" : "Back to home";

  return (
    <main
      className={`mx-auto flex min-h-screen w-full max-w-2xl flex-col p-4 sm:p-8 ${bottomPadding} ${
        performanceMode ? "song-page--performance" : ""
      }`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <ConfirmDialog
        open={showDelete}
        title="Delete song?"
        message={`"${song.title}" will be removed from the shared library.`}
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => setShowDelete(false)}
      />

      {user && isAdmin && (
        <AddToSessionModal
          open={showAddToSession}
          songId={id}
          songTitle={song.title}
          onClose={() => setShowAddToSession(false)}
        />
      )}

      <SongHeader
        title={song.title}
        artist={artist}
        backHref={backHref}
        backLabel={backLabel}
        compact={isMobile || performanceMode}
        isAdmin={Boolean(user && isAdmin)}
        editBusy={editBusy}
        onEdit={() => {
          void handleEdit();
        }}
        onAddToSession={() => setShowAddToSession(true)}
        onDelete={() => setShowDelete(true)}
      />

      {version !== null && isAdmin && (
        <p className="text-xs text-lf-text-tertiary">Library version {version}</p>
      )}

      {!isMobile && (
        <SongControlBar
          targetKey={currentKey}
          originalKey={originalKey}
          viewMode={viewMode}
          scalePercent={zoom.scalePercent}
          transposeFlash={transposeFlash}
          showMobileControls={false}
          onTransposeDown={() => handleTranspose(-1)}
          onTransposeUp={() => handleTranspose(1)}
          onOpenKeyModal={() => setShowKeyModal(true)}
          onViewModeChange={setViewMode}
          onZoomOut={zoom.zoomOut}
          onZoomIn={zoom.zoomIn}
          autoscrollActive={autoscroll.active}
          onToggleAutoscroll={() => {
            if (autoscroll.active) {
              autoscroll.stop();
            } else {
              autoscroll.start();
            }
          }}
        />
      )}

      {isMobile && !performanceMode && (
        <SongControlBar
          targetKey={currentKey}
          originalKey={originalKey}
          viewMode={viewMode}
          scalePercent={zoom.scalePercent}
          transposeFlash={transposeFlash}
          showMobileControls
          onTransposeDown={() => handleTranspose(-1)}
          onTransposeUp={() => handleTranspose(1)}
          onOpenKeyModal={() => setShowKeyModal(true)}
          onViewModeChange={setViewMode}
          onZoomOut={zoom.zoomOut}
          onZoomIn={zoom.zoomIn}
          autoscrollActive={autoscroll.active}
          onToggleAutoscroll={() => {
            if (autoscroll.active) {
              autoscroll.stop();
            } else {
              autoscroll.start();
            }
          }}
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

      {deleteError && (
        <p className="mb-2 text-sm text-lf-danger">{deleteError}</p>
      )}

      {!performanceMode && draft && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Draft in progress.{" "}
          <Link href={`/song/${id}/edit`} className="font-medium underline">
            Continue editing
          </Link>
        </p>
      )}

      <ChordChartViewport
        scale={zoom.scale}
        scalePercent={zoom.scalePercent}
        showIndicator={zoom.showIndicator}
        containerRef={containerRef}
        onPinchScale={handlePinchScale}
        onPinchEnd={handlePinchEnd}
        onDoubleTap={zoom.toggleZoomPreset}
        className="mt-2 min-w-0 flex-1 sm:mt-4"
      >
        <div className="chord-chart">
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

      {isMobile && !autoscroll.active && (
        <PerformanceBottomBar
          targetKey={currentKey}
          originalKey={originalKey}
          onTransposeDown={() => handleTranspose(-1)}
          onTransposeUp={() => handleTranspose(1)}
          onZoomOut={zoom.zoomOut}
          onZoomIn={zoom.zoomIn}
          scalePercent={zoom.scalePercent}
          chartTheme={chartTheme}
          onToggleTheme={handleToggleTheme}
          transposeFlash={transposeFlash}
          sessionLabel={session?.title ?? null}
          sessionPosition={sessionPosition}
          prevHref={prevHref}
          nextHref={nextHref}
          sessionBackHref={sessionId ? `/sessions/${sessionId}` : null}
        />
      )}

      {user && isAdmin && archives.length > 0 && (
        <section className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Version history
          </h2>
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {archives.map((archive) => (
              <li
                key={archive.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>
                  v{archive.version} · {archive.title}
                </span>
                <span className="text-neutral-500">
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
