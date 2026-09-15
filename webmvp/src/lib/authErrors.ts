import { prefersAuthRedirect as prefersAuthRedirectFromSignals } from "@/lib/authRedirect";
import { formatError } from "@/lib/formatError";

function authErrorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

/** Friendly messages for Firebase Auth errors shown in login/signup UI. */
export function formatAuthError(error: unknown): string {
  switch (authErrorCode(error)) {
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Pop-up was blocked. Allow pop-ups for this site or try again.";
    case "auth/cancelled-popup-request":
      return "Sign-in was interrupted. Please try again.";
    case "auth/account-exists-with-different-credential":
      return "This email already has an account. Sign in with email and password instead.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/redirect-cancelled-by-user":
      return "Sign-in was cancelled.";
    case "auth/unauthorized-domain":
      return "This site is not authorized for sign-in. Contact support if this persists.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled for this app.";
    default:
      return formatError(error);
  }
}

function prefersAuthRedirect(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return prefersAuthRedirectFromSignals({
    userAgent: navigator.userAgent,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    hoverNone: window.matchMedia("(hover: none)").matches,
    maxWidth1024: window.matchMedia("(max-width: 1024px)").matches,
  });
}

export { prefersAuthRedirect };
