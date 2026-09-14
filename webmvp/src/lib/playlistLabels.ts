import type { SessionStatus } from "@/lib/types";

/** User-facing playlist visibility label (DB field stays draft/published). */
export function playlistVisibilityLabel(status: SessionStatus): string {
  return status === "draft" ? "Private" : "Public";
}

export function playlistVisibilitySuffix(status: SessionStatus): string {
  return status === "draft" ? " · Private" : "";
}

export const PUBLISH_CONFIRM_MESSAGE =
  "This playlist will be visible to all signed-in LF Chords users. Private playlists are only visible to you and people you invite.";
