import { describe, expect, it } from "vitest";

import { isKey, transposeKeyBy } from "@/lib/keyUtils";

describe("keyUtils", () => {
  it("transposes keys by semitones", () => {
    expect(transposeKeyBy("C", 2)).toBe("D");
    expect(transposeKeyBy("B", 1)).toBe("C");
    expect(transposeKeyBy("C", -1)).toBe("B");
  });

  it("validates keys", () => {
    expect(isKey("G")).toBe(true);
    expect(isKey("H")).toBe(false);
  });
});
