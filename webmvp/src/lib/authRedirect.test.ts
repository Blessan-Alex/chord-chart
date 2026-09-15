import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTH_REDIRECT_PENDING_KEY,
  clearAuthRedirectPending,
  isAuthRedirectPending,
  markAuthRedirectPending,
} from "@/lib/authRedirect";

describe("auth redirect session flag", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
  });

  it("marks and clears pending redirect state", () => {
    expect(isAuthRedirectPending()).toBe(false);
    markAuthRedirectPending();
    expect(isAuthRedirectPending()).toBe(true);
    clearAuthRedirectPending();
    expect(isAuthRedirectPending()).toBe(false);
  });

  it("uses a stable storage key", () => {
    markAuthRedirectPending();
    expect(storage.get(AUTH_REDIRECT_PENDING_KEY)).toBe("1");
  });
});
