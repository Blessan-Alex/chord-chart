export type PlaylistSharePayload = {
  id: string;
  title: string;
  inviteToken: string;
};

export type SongSharePayload = {
  id: string;
  title: string;
};

export function playlistInvitePath(token: string): string {
  return `/join/p/${encodeURIComponent(token)}`;
}

export function playlistInviteUrl(token: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${playlistInvitePath(token)}`;
}

export function songPagePath(songId: string): string {
  return `/song/${songId}`;
}

export function songShareUrl(songId: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${songPagePath(songId)}`;
}

async function copyTextFallback(text: string): Promise<boolean> {
  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyUrl(url: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      /* fall through */
    }
  }
  return copyTextFallback(url);
}

export async function copyPlaylistInviteLink(token: string): Promise<boolean> {
  return copyUrl(playlistInviteUrl(token));
}

export async function copySongLink(songId: string): Promise<boolean> {
  return copyUrl(songShareUrl(songId));
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export type NativeShareResult = "shared" | "copied" | "cancelled" | "failed";

async function shareNative(
  url: string,
  title: string,
  text: string,
): Promise<NativeShareResult> {
  if (canUseNativeShare()) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const copied = await copyUrl(url);
  return copied ? "copied" : "failed";
}

export async function sharePlaylistNative(
  session: PlaylistSharePayload,
): Promise<NativeShareResult> {
  return shareNative(
    playlistInviteUrl(session.inviteToken),
    session.title,
    `Join set list: ${session.title}`,
  );
}

export async function shareSongNative(
  song: SongSharePayload,
): Promise<NativeShareResult> {
  return shareNative(
    songShareUrl(song.id),
    song.title,
    `Chord chart: ${song.title}`,
  );
}

export function shareResultMessage(result: NativeShareResult): string | null {
  switch (result) {
    case "shared":
      return "Link shared.";
    case "copied":
      return "Link copied — paste in WhatsApp or Messages.";
    case "cancelled":
      return null;
    case "failed":
      return "Could not share or copy the link.";
  }
}

export function playlistShareResultMessage(result: NativeShareResult): string | null {
  if (result === "shared") {
    return "Invite link shared.";
  }
  if (result === "copied") {
    return "Invite link copied — paste in WhatsApp or Messages.";
  }
  return shareResultMessage(result);
}
