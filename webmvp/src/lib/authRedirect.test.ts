import { describe, expect, it } from "vitest";

import { prefersAuthRedirect } from "@/lib/authRedirect";

describe("prefersAuthRedirect", () => {
  it("prefers redirect on mobile user agents", () => {
    expect(
      prefersAuthRedirect({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        coarsePointer: false,
        hoverNone: false,
        maxWidth1024: false,
      }),
    ).toBe(true);
  });

  it("prefers redirect on coarse pointer devices", () => {
    expect(
      prefersAuthRedirect({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        coarsePointer: true,
        hoverNone: false,
        maxWidth1024: false,
      }),
    ).toBe(true);
  });

  it("uses popup flow on desktop with fine pointer", () => {
    expect(
      prefersAuthRedirect({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        coarsePointer: false,
        hoverNone: false,
        maxWidth1024: false,
      }),
    ).toBe(false);
  });
});
