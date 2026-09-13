import { describe, expect, it } from "vitest";

import { userDisplayName, userInitials } from "./userDisplay";

describe("userInitials", () => {
  it("returns ? for empty names", () => {
    expect(userInitials("")).toBe("?");
    expect(userInitials("   ")).toBe("?");
  });

  it("uses first two letters for single word", () => {
    expect(userInitials("Alex")).toBe("AL");
  });

  it("uses first letters of first two words", () => {
    expect(userInitials("Alex Rivera")).toBe("AR");
  });

  it("handles extra whitespace", () => {
    expect(userInitials("  Morgan   Phillips  ")).toBe("MP");
  });
});

describe("userDisplayName", () => {
  it("prefers display name", () => {
    expect(userDisplayName("Alex Rivera", "alex@example.com")).toBe(
      "Alex Rivera",
    );
  });

  it("falls back to email local part", () => {
    expect(userDisplayName(null, "alex@example.com")).toBe("alex");
  });

  it("returns Guest when nothing provided", () => {
    expect(userDisplayName(null, null)).toBe("Guest");
  });

  it("ignores blank display names", () => {
    expect(userDisplayName("   ", "alex@example.com")).toBe("alex");
  });
});
