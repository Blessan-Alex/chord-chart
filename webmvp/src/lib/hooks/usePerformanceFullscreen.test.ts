import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  exitNativeFullscreen,
  isNativeFullscreenActive,
  isNativeFullscreenSupported,
  requestNativeFullscreen,
} from "@/lib/hooks/usePerformanceFullscreen";

describe("usePerformanceFullscreen helpers", () => {
  const requestFullscreen = vi.fn();
  const exitFullscreen = vi.fn();

  beforeEach(() => {
    requestFullscreen.mockResolvedValue(undefined);
    exitFullscreen.mockResolvedValue(undefined);

    vi.stubGlobal("document", {
      fullscreenEnabled: true,
      fullscreenElement: null,
      documentElement: {
        requestFullscreen,
      },
      exitFullscreen,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects native fullscreen support", () => {
    expect(isNativeFullscreenSupported()).toBe(true);
  });

  it("requests native fullscreen when supported", async () => {
    await expect(requestNativeFullscreen()).resolves.toBe(true);
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it("falls back when native fullscreen is unavailable", async () => {
    const localRequestFullscreen = vi.fn();

    vi.stubGlobal("document", {
      fullscreenEnabled: false,
      fullscreenElement: null,
      documentElement: {
        requestFullscreen: localRequestFullscreen,
      },
      exitFullscreen,
    });

    await expect(requestNativeFullscreen()).resolves.toBe(false);
    expect(localRequestFullscreen).not.toHaveBeenCalled();
  });

  it("exits native fullscreen when active", async () => {
    vi.stubGlobal("document", {
      fullscreenEnabled: true,
      fullscreenElement: {},
      documentElement: { requestFullscreen },
      exitFullscreen,
    });

    expect(isNativeFullscreenActive()).toBe(true);
    await exitNativeFullscreen();
    expect(exitFullscreen).toHaveBeenCalledOnce();
  });
});
