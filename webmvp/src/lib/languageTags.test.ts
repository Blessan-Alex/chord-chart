import { describe, expect, it } from "vitest";

import {
  getLanguageTag,
  isLanguageTag,
  languageLabel,
  setLanguageTag,
} from "@/lib/languageTags";

describe("languageTags", () => {
  it("identifies language tags", () => {
    expect(isLanguageTag("lang:malayalam")).toBe(true);
    expect(isLanguageTag("worship")).toBe(false);
  });

  it("returns display labels", () => {
    expect(languageLabel("lang:hindi")).toBe("Hindi");
    expect(languageLabel("worship")).toBeNull();
  });

  it("extracts the language tag from a tag list", () => {
    expect(getLanguageTag(["worship", "lang:tamil"])).toBe("lang:tamil");
    expect(getLanguageTag(["worship"])).toBeNull();
  });

  it("sets or clears the language tag", () => {
    expect(setLanguageTag(["worship", "lang:hindi"], "lang:malayalam")).toEqual([
      "worship",
      "lang:malayalam",
    ]);
    expect(setLanguageTag(["worship", "lang:hindi"], null)).toEqual(["worship"]);
  });
});
