import { describe, expect, it } from "vitest";

import {
  graphemeLocaleFromTags,
  localeFromLanguageTag,
  lyricScriptFromTags,
} from "@/lib/localeFromLanguageTag";

describe("localeFromLanguageTag", () => {
  it("maps supported language tags to Intl locales", () => {
    expect(localeFromLanguageTag("lang:malayalam")).toBe("ml");
    expect(localeFromLanguageTag("lang:tamil")).toBe("ta");
    expect(localeFromLanguageTag("lang:telugu")).toBe("te");
    expect(localeFromLanguageTag("lang:hindi")).toBe("hi");
    expect(localeFromLanguageTag("lang:marathi")).toBe("mr");
    expect(localeFromLanguageTag(null)).toBe("en");
  });

  it("reads locale from tag list", () => {
    expect(graphemeLocaleFromTags(["worship", "lang:tamil"])).toBe("ta");
  });

  it("maps script for CSS", () => {
    expect(lyricScriptFromTags(["lang:telugu"])).toBe("telugu");
    expect(lyricScriptFromTags(["lang:english"])).toBe("latin");
  });
});
