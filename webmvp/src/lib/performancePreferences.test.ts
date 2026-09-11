import { describe, expect, it } from "vitest";

import {
  clampChartScale,
  snapChartScale,
} from "@/lib/performancePreferences";

describe("performancePreferences", () => {
  it("clamps zoom scale", () => {
    expect(clampChartScale(0.5)).toBe(0.85);
    expect(clampChartScale(3)).toBe(2);
    expect(clampChartScale(1.2)).toBe(1.2);
  });

  it("snaps zoom scale to step", () => {
    expect(snapChartScale(1.12)).toBe(1.1);
    expect(snapChartScale(1.13)).toBe(1.15);
  });
});
