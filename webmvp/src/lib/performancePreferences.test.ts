import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clampChartScale,
  resolveChartTheme,
  snapChartScale,
} from "@/lib/performancePreferences";

describe("performancePreferences", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clamps zoom scale", () => {
    expect(clampChartScale(0.5)).toBe(0.85);
    expect(clampChartScale(3)).toBe(2);
    expect(clampChartScale(1.2)).toBe(1.2);
  });

  it("snaps zoom scale to step", () => {
    expect(snapChartScale(1.12)).toBe(1.1);
    expect(snapChartScale(1.13)).toBe(1.15);
  });

  it("defaults chart theme to stage in playlist context", () => {
    expect(resolveChartTheme("session-1")).toBe("stage");
  });

  it("respects saved dark theme in playlist context", () => {
    storage.set("lf-theme", "dark");
    expect(resolveChartTheme("session-1")).toBe("dark");
  });

  it("uses system theme outside playlist context", () => {
    expect(resolveChartTheme(null)).toBe("system");
  });
});
