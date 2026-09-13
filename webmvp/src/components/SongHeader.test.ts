import { describe, expect, it } from "vitest";

import { SongHeader } from "./SongHeader";

describe("SongHeader", () => {
  it("exports a header component", () => {
    expect(SongHeader).toBeTypeOf("function");
  });
});
