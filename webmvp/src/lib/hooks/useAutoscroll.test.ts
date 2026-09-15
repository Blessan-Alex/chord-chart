import { describe, expect, it } from "vitest";

import { clampAutoscrollSpeed } from "./useAutoscroll";

describe("clampAutoscrollSpeed", () => {
  it("clamps below minimum speed", () => {
    expect(clampAutoscrollSpeed(0.05)).toBe(0.1);
  });

  it("clamps to maximum speed", () => {
    expect(clampAutoscrollSpeed(3)).toBe(2);
  });

  it("rounds to two decimal places", () => {
    expect(clampAutoscrollSpeed(1.156)).toBe(1.16);
  });
});
