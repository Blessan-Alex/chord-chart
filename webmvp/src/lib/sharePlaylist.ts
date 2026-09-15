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

export function songShareMessage(title: string, url: string): string {
  return `Check out "${title}" from the LF Chords app ${url}`;
}

export function playlistShareMessage(title: string, url: string): string {
  return `Check out "${title}" from the LF Chords app ${url}`;
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

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  return copyTextFallback(text);
}

export async function copyPlaylistInviteLink(
  token: string,
  title?: string,
  origin?: string,
): Promise<boolean> {
  const url = playlistInviteUrl(token, origin);
  const text = title ? playlistShareMessage(title, url) : url;
  return copyText(text);
}

export async function copySongLink(
  songId: string,
  title?: string,
  origin?: string,
): Promise<boolean> {
  const url = songShareUrl(songId, origin);
  const text = title ? songShareMessage(title, url) : url;
  return copyText(text);
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
      await navigator.share({ title, text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const copied = await copyText(text);
  return copied ? "copied" : "failed";
}

export async function sharePlaylistNative(
  session: PlaylistSharePayload,
): Promise<NativeShareResult> {
  const url = playlistInviteUrl(session.inviteToken);
  return shareNative(
    url,
    session.title,
    playlistShareMessage(session.title, url),
  );
}

export async function shareSongNative(
  song: SongSharePayload,
): Promise<NativeShareResult> {
  const url = songShareUrl(song.id);
  return shareNative(url, song.title, songShareMessage(song.title, url));
}

export function shareResultMessage(result: NativeShareResult): string | null {
  switch (result) {
    case "shared":
      return "Link shared.";
    case "copied":
      return "Message copied — paste in WhatsApp or Messages.";
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
    return "Message copied — paste in WhatsApp or Messages.";
  }
  return shareResultMessage(result);
}
