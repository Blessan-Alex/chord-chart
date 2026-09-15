export function prefersAuthRedirect(options: {
  userAgent: string;
  coarsePointer: boolean;
  hoverNone: boolean;
  maxWidth1024: boolean;
}): boolean {
  const mobileUa =
    /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      options.userAgent,
    );

  return (
    mobileUa ||
    options.coarsePointer ||
    (options.hoverNone && options.maxWidth1024)
  );
}

export const AUTH_REDIRECT_PENDING_KEY = "authRedirectPending";

export function markAuthRedirectPending(): void {
  try {
    sessionStorage.setItem(AUTH_REDIRECT_PENDING_KEY, "1");
  } catch {
    // sessionStorage may be unavailable in some private browsing modes.
  }
}

export function clearAuthRedirectPending(): void {
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_PENDING_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function isAuthRedirectPending(): boolean {
  try {
    return sessionStorage.getItem(AUTH_REDIRECT_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}
