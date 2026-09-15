import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isWakeLockSupported } from "@/lib/hooks/useWakeLock";

describe("useWakeLock helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      wakeLock: {
        request: vi.fn().mockResolvedValue({
          release: vi.fn().mockResolvedValue(undefined),
          addEventListener: vi.fn(),
        }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects wake lock support", () => {
    expect(isWakeLockSupported()).toBe(true);
  });

  it("reports unsupported when wakeLock is missing", () => {
    vi.stubGlobal("navigator", {});
    expect(isWakeLockSupported()).toBe(false);
  });
});
