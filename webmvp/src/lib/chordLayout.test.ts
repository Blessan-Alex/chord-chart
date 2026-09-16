import { describe, expect, it } from "vitest";

import { maxTierUsed, resolveChordLayout } from "./chordLayout";

describe("resolveChordLayout", () => {
  it("places single chord at anchor on tier 0", () => {
    const placements = resolveChordLayout({
      starts: [3],
      anchorLeft: [40],
      width: [32],
    });
    expect(placements).toEqual([{ left: 40, tier: 0 }]);
  });

  it("stacks second crowded chord on tier 1 (Dsus2 + Bm7 style)", () => {
    const placements = resolveChordLayout({
      starts: [10, 12],
      anchorLeft: [80, 95],
      width: [42, 28],
      gap: 5,
    });
    expect(placements[0]).toEqual({ left: 80, tier: 0 });
    expect(placements[1].tier).toBe(1);
    expect(placements[1].left).toBe(95);
  });

  it("packs horizontally on tier 1 when anchors collide", () => {
    const placements = resolveChordLayout({
      starts: [0, 1, 2],
      anchorLeft: [0, 8, 16],
      width: [50, 50, 50],
      gap: 5,
    });
    expect(placements[0].tier).toBe(0);
    expect(placements[1].tier).toBe(1);
    expect(placements[2].tier).toBe(1);
    expect(placements[2].left).toBeGreaterThanOrEqual(
      placements[1].left + 50 + 5,
    );
  });

  it("assigns distinct placements when two chords share the same start index", () => {
    const placements = resolveChordLayout({
      starts: [0, 0],
      anchorLeft: [10, 10],
      width: [36, 28],
      gap: 5,
    });
    expect(placements).toHaveLength(2);
    expect(placements[0]).toEqual({ left: 10, tier: 0 });
    expect(placements[1].tier).toBe(1);
  });

  it("maxTierUsed returns highest tier index", () => {
    const placements = resolveChordLayout({
      starts: [0, 1],
      anchorLeft: [0, 5],
      width: [60, 60],
    });
    expect(maxTierUsed(placements)).toBe(1);
  });
});
