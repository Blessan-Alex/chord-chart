import { describe, expect, it } from "vitest";

import { resolveSongId, slugifyTitle } from "@/lib/songId";

describe("slugifyTitle", () => {
  it("creates ASCII slugs from Latin titles", () => {
    expect(slugifyTitle("Good Good Father")).toBe("good-good-father");
  });

  it("returns empty for non-Latin-only titles", () => {
    expect(slugifyTitle("നന്ദി യേശുവേ")).toBe("");
  });
});

describe("resolveSongId", () => {
  it("prefers an explicit id", () => {
    expect(resolveSongId("Any Title", "custom-id")).toBe("custom-id");
  });

  it("uses slug for Latin titles", () => {
    expect(resolveSongId("Amazing Grace")).toBe("amazing-grace");
  });

  it("falls back to UUID when slug is empty", () => {
    const id = resolveSongId("നന്ദി യേശുവേ");
    expect(id.length).toBeGreaterThan(0);
    expect(id).not.toBe("");
  });
});
