import { describe, expect, it } from "vitest";

import { suggestUsername } from "@/lib/usernameSuggestions";

describe("suggestUsername", () => {
  it("prefers display name when long enough", () => {
    expect(suggestUsername("alex.rivera@gmail.com", "Alex Rivera")).toBe(
      "alex_rivera",
    );
  });

  it("falls back to email prefix", () => {
    expect(suggestUsername("alex.rivera@gmail.com", null)).toBe("alexrivera");
  });

  it("returns empty when no usable source", () => {
    expect(suggestUsername(null, null)).toBe("");
  });
});
