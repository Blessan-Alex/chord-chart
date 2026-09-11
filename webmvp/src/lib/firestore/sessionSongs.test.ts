import { describe, expect, it } from "vitest";

import { computeMidOrder } from "./sessionSongs";

describe("computeMidOrder", () => {
  it("returns midpoint between neighbours", () => {
    expect(computeMidOrder(1000, 2000)).toBe(1500);
  });

  it("supports fractional insert between close values", () => {
    expect(computeMidOrder(1000, 1001)).toBe(1000.5);
  });
});
