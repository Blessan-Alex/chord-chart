"use client";

import { AutoscrollToggleButton } from "@/components/AutoscrollToggleButton";
import { ChartZoomButtons } from "@/components/ChartZoomButtons";
import { FullscreenToggleButton } from "@/components/FullscreenToggleButton";
import { IconActionButton } from "@/components/IconActionButton";
import { SongShareButton } from "@/components/SongShareButton";
import type { Key } from "@/lib/engine";
import type { SongSharePayload } from "@/lib/sharePlaylist";
import type { SongViewMode } from "@/lib/types";

type SongControlBarProps = {
  targetKey: Key;
  originalKey: Key;
  viewMode: SongViewMode;
  transposeFlash?: Key | null;
  showMobileControls: boolean;
  onTransposeDown: () => void;
  onTransposeUp: () => void;
  onOpenKeyModal: () => void;
  onViewModeChange: (mode: SongViewMode) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onToggleAutoscroll: () => void;
  autoscrollActive?: boolean;
  fullscreenActive?: boolean;
  onToggleFullscreen?: () => void;
  showAddToPlaylist?: boolean;
  onAddToPlaylist?: () => void;
  shareSong?: SongSharePayload;
};

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 px-4 text-sm font-medium transition-colors ${
        active
          ? "bg-lf-action-primary text-lf-text-inverse"
          : "text-lf-text-secondary hover:text-lf-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function PlaylistIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 5H3" />
      <path d="M11 12H3" />
      <path d="M11 19H3" />
      <path d="M21 16V5" />
      <path d="M18.5 16.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    </svg>
  );
}

function ViewModeSegment({
  viewMode,
  onViewModeChange,
}: {
  viewMode: SongViewMode;
  onViewModeChange: (mode: SongViewMode) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated">
      <SegmentButton
        active={viewMode === "chords"}
        onClick={() => onViewModeChange("chords")}
      >
        Chords
      </SegmentButton>
      <SegmentButton
        active={viewMode === "numbers"}
        onClick={() => onViewModeChange("numbers")}
      >
        Numbers
      </SegmentButton>
    </div>
  );
}

function AddToPlaylistButton({ onAddToPlaylist }: { onAddToPlaylist: () => void }) {
  return (
    <IconActionButton label="Add to playlist" onClick={onAddToPlaylist}>
      <PlaylistIcon />
    </IconActionButton>
  );
}

function SongActionButtons({
  showAddToPlaylist,
  onAddToPlaylist,
  shareSong,
}: {
  showAddToPlaylist: boolean;
  onAddToPlaylist?: () => void;
  shareSong?: SongSharePayload;
}) {
  if (!shareSong && !(showAddToPlaylist && onAddToPlaylist)) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {showAddToPlaylist && onAddToPlaylist && (
        <AddToPlaylistButton onAddToPlaylist={onAddToPlaylist} />
      )}
      {shareSong && <SongShareButton song={shareSong} />}
    </div>
  );
}

export function SongControlBar({
  targetKey,
  originalKey,
  viewMode,
  transposeFlash,
  showMobileControls,
  onTransposeDown,
  onTransposeUp,
  onOpenKeyModal,
  onViewModeChange,
  onZoomOut,
  onZoomIn,
  onToggleAutoscroll,
  autoscrollActive = false,
  fullscreenActive = false,
  onToggleFullscreen,
  showAddToPlaylist = false,
  onAddToPlaylist,
  shareSong,
}: SongControlBarProps) {
  const displayKey = transposeFlash ?? targetKey;

  if (showMobileControls) {
    return (
      <div className="mt-3 flex items-center justify-between gap-2">
        <ViewModeSegment viewMode={viewMode} onViewModeChange={onViewModeChange} />
        <SongActionButtons
          showAddToPlaylist={showAddToPlaylist}
          onAddToPlaylist={onAddToPlaylist}
          shareSong={shareSong}
        />
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated p-1">
          <button
            type="button"
            aria-label="Transpose down"
            onClick={onTransposeDown}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--lf-radius-sm)] text-lg font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
          >
            −
          </button>
          <button
            type="button"
            onClick={onOpenKeyModal}
            className="inline-flex min-h-10 min-w-14 flex-col items-center justify-center rounded-[var(--lf-radius-sm)] bg-lf-bg-active px-3 text-sm font-semibold text-lf-brand"
            aria-label={`Key ${displayKey}`}
          >
            {displayKey}
          </button>
          <button
            type="button"
            aria-label="Transpose up"
            onClick={onTransposeUp}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--lf-radius-sm)] text-lg font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
          >
            +
          </button>
        </div>

        <ViewModeSegment viewMode={viewMode} onViewModeChange={onViewModeChange} />

        <SongActionButtons
          showAddToPlaylist={showAddToPlaylist}
          onAddToPlaylist={onAddToPlaylist}
          shareSong={shareSong}
        />

        <ChartZoomButtons
          variant="desktop"
          onZoomOut={onZoomOut}
          onZoomIn={onZoomIn}
        />

        <AutoscrollToggleButton
          variant="desktop"
          active={autoscrollActive}
          onClick={onToggleAutoscroll}
        />

        {onToggleFullscreen && (
          <FullscreenToggleButton
            variant="desktop"
            active={fullscreenActive}
            onClick={onToggleFullscreen}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-lf-text-tertiary">
          Original key
        </span>
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-lf-bg-active px-2 text-sm font-semibold text-lf-brand">
          {originalKey}
        </span>
      </div>
    </div>
  );
}
