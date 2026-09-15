import { normalizeUsername } from "@/lib/validation";

/** Suggest a valid username from Google/email profile data. */
export function suggestUsername(
  email?: string | null,
  displayName?: string | null,
): string {
  if (displayName?.trim()) {
    const fromName = normalizeUsername(
      displayName.trim().replace(/\s+/g, "_"),
    ).replace(/[^a-z0-9_]/g, "");
    if (fromName.length >= 3) {
      return fromName.slice(0, 20);
    }
  }

  if (email) {
    const prefix = email.split("@")[0] ?? "";
    const normalized = normalizeUsername(prefix).replace(/[^a-z0-9_]/g, "");
    if (normalized.length >= 3) {
      return normalized.slice(0, 20);
    }
  }

  return "";
}
