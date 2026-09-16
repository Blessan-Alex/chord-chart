import { describe, expect, it } from "vitest";

import {
  clampAutoscrollSpeed,
  decreaseAutoscrollSpeed,
  formatAutoscrollSpeed,
  increaseAutoscrollSpeed,
  resolveAutoscrollPixelsPerSecond,
  resolveDefaultAutoscrollSpeed,
} from "@/lib/autoscrollSpeed";

describe("clampAutoscrollSpeed", () => {
  it("clamps below minimum", () => {
    expect(clampAutoscrollSpeed(0.05)).toBe(0.1);
    expect(clampAutoscrollSpeed(0.2)).toBe(0.2);
  });

  it("clamps above maximum", () => {
    expect(clampAutoscrollSpeed(3)).toBe(2);
  });

  it("rounds to two decimal places", () => {
    expect(clampAutoscrollSpeed(1.156)).toBe(1.16);
  });
});

describe("autoscroll speed steps", () => {
  it("decreases by 0.05 below 1x", () => {
    expect(decreaseAutoscrollSpeed(0.15)).toBe(0.1);
  });

  it("decreases by 0.1 at and above 1x", () => {
    expect(decreaseAutoscrollSpeed(1)).toBe(0.9);
  });

  it("increases from 0.95 to 1.0", () => {
    expect(increaseAutoscrollSpeed(0.95)).toBe(1);
  });
});

describe("resolveDefaultAutoscrollSpeed", () => {
  it("uses touch default on touch devices", () => {
    expect(resolveDefaultAutoscrollSpeed(true)).toBe(0.4);
  });

  it("uses desktop default otherwise", () => {
    expect(resolveDefaultAutoscrollSpeed(false)).toBe(0.7);
  });
});

describe("resolveAutoscrollPixelsPerSecond", () => {
  it("applies touch multiplier on touch devices", () => {
    expect(resolveAutoscrollPixelsPerSecond(0.1, true)).toBeCloseTo(1.7, 5);
  });

  it("uses full rate on desktop", () => {
    expect(resolveAutoscrollPixelsPerSecond(0.7, false)).toBeCloseTo(14, 5);
  });

  it("scales scroll rate with speed setting", () => {
    const slow = resolveAutoscrollPixelsPerSecond(0.1, false);
    const fast = resolveAutoscrollPixelsPerSecond(2, false);
    expect(fast).toBeGreaterThan(slow * 10);
  });
});

describe("formatAutoscrollSpeed", () => {
  it("shows two decimals below 1x", () => {
    expect(formatAutoscrollSpeed(0.45)).toBe("0.45");
  });

  it("shows one decimal at and above 1x", () => {
    expect(formatAutoscrollSpeed(1.2)).toBe("1.2");
  });
});
