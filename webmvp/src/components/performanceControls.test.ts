import { describe, expect, it } from "vitest";

import { AutoscrollToggleButton } from "./AutoscrollToggleButton";
import { ChartZoomButtons } from "./ChartZoomButtons";
import { PerformanceBottomBar } from "./PerformanceBottomBar";
import { SongControlBar } from "./SongControlBar";

describe("performance control components", () => {
  it("exports shared control components", () => {
    expect(AutoscrollToggleButton).toBeTypeOf("function");
    expect(ChartZoomButtons).toBeTypeOf("function");
    expect(PerformanceBottomBar).toBeTypeOf("function");
    expect(SongControlBar).toBeTypeOf("function");
  });
});
