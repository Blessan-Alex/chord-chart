import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyAppTheme,
  readAppTheme,
  writeAppTheme,
} from "./theme";

describe("theme", () => {
  const storage = new Map<string, string>();
  const htmlEl = {
    dataset: {} as Record<string, string>,
    removeAttribute(name: string) {
      if (name === "data-theme") {
        delete this.dataset.theme;
      }
    },
  };

  beforeEach(() => {
    storage.clear();
    htmlEl.dataset = {};

    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      clear: () => {
        storage.clear();
      },
    };

    vi.stubGlobal("window", { localStorage: localStorageMock });
    vi.stubGlobal("localStorage", localStorageMock);

    vi.stubGlobal("document", {
      documentElement: htmlEl,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to light when nothing stored", () => {
    expect(readAppTheme()).toBe("light");
  });

  it("reads dark from localStorage", () => {
    storage.set("lf-theme", "dark");
    expect(readAppTheme()).toBe("dark");
  });

  it("treats invalid stored values as light", () => {
    storage.set("lf-theme", "stage");
    expect(readAppTheme()).toBe("light");
  });

  it("writeAppTheme persists and applies data-theme", () => {
    writeAppTheme("dark");
    expect(storage.get("lf-theme")).toBe("dark");
    expect(htmlEl.dataset.theme).toBe("dark");
  });

  it("applyAppTheme sets data-theme without storage", () => {
    applyAppTheme("light");
    expect(htmlEl.dataset.theme).toBe("light");
    expect(storage.has("lf-theme")).toBe(false);
  });

  it("returns light during SSR", () => {
    vi.unstubAllGlobals();
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    expect(readAppTheme()).toBe("light");
  });
});
