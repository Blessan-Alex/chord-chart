/** Only allow same-origin relative paths after login/signup. */
export function getSafeRedirectPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  return next;
}
