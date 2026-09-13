import { describe, expect, it } from "vitest";

import { clampAutoscrollSpeed } from "./useAutoscroll";

describe("clampAutoscrollSpeed", () => {
  it("clamps to minimum speed", () => {
    expect(clampAutoscrollSpeed(0.2)).toBe(0.5);
  });

  it("clamps to maximum speed", () => {
    expect(clampAutoscrollSpeed(3)).toBe(2);
  });

  it("rounds to one decimal place", () => {
    expect(clampAutoscrollSpeed(1.15)).toBe(1.1);
    expect(clampAutoscrollSpeed(1.16)).toBe(1.2);
  });
});
