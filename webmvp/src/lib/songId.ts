/** Derive a URL-safe Firestore document id from a song title. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createSongId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `song-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Prefer explicit id, then ASCII slug, then UUID for non-Latin titles. */
export function resolveSongId(title: string, explicitId?: string | null): string {
  const trimmed = explicitId?.trim();
  if (trimmed) {
    return trimmed;
  }

  const slug = slugifyTitle(title);
  if (slug) {
    return slug;
  }

  return createSongId();
}
