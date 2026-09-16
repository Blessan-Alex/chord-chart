/** Skyline layout for chord labels above lyrics (display-only; anchors unchanged in data). */

export type ChordLayoutPlacement = {
  left: number;
  tier: number;
};

export type ResolveChordLayoutInput = {
  /** Character start indices, sorted ascending. */
  starts: number[];
  /** Measured pixel anchor per chord (same order as starts). */
  anchorLeft: number[];
  /** Label width in px per chord (same order as starts). */
  width: number[];
  gap?: number;
  maxTiers?: number;
};

function overlaps(
  left: number,
  width: number,
  otherLeft: number,
  otherWidth: number,
  gap: number,
): boolean {
  return left < otherLeft + otherWidth + gap && left + width + gap > otherLeft;
}

function rightEdge(left: number, width: number): number {
  return left + width;
}

/**
 * Places chord labels on up to two tiers to avoid horizontal overlap.
 * Tier 0 stays at lyric anchors when possible; crowded chords move to tier 1.
 */
export function resolveChordLayout(
  input: ResolveChordLayoutInput,
): ChordLayoutPlacement[] {
  const {
    starts,
    anchorLeft,
    width,
    gap = 5,
    maxTiers = 2,
  } = input;

  const count = starts.length;
  if (count === 0) {
    return [];
  }

  const placed: ChordLayoutPlacement[] = [];
  const tierPlaced: ChordLayoutPlacement[][] = Array.from(
    { length: maxTiers },
    () => [],
  );

  for (let i = 0; i < count; i++) {
    const anchor = anchorLeft[i] ?? 0;
    const w = width[i] ?? 0;
    let assigned: ChordLayoutPlacement | null = null;

    for (let tier = 0; tier < maxTiers; tier++) {
      let left = anchor;

      if (tier === 1) {
        const onTier = tierPlaced[1];
        const lastOnTier = onTier[onTier.length - 1];
        if (lastOnTier) {
          const lastIdx = placed.indexOf(lastOnTier);
          const lastWidth = lastIdx >= 0 ? (width[lastIdx] ?? 0) : 0;
          left = Math.max(anchor, rightEdge(lastOnTier.left, lastWidth) + gap);
        }
      }

      const collides = tierPlaced[tier].some((p) => {
        const idx = placed.indexOf(p);
        const pw = idx >= 0 ? (width[idx] ?? 0) : 0;
        return overlaps(left, w, p.left, pw, gap);
      });

      if (!collides) {
        assigned = { left, tier };
        tierPlaced[tier].push(assigned);
        placed.push(assigned);
        break;
      }
    }

    if (!assigned) {
      const fallback = { left: anchor, tier: maxTiers - 1 };
      tierPlaced[maxTiers - 1].push(fallback);
      placed.push(fallback);
    }
  }

  return placed;
}

export function maxTierUsed(placements: ChordLayoutPlacement[]): number {
  if (placements.length === 0) {
    return 0;
  }
  return placements.reduce((max, p) => Math.max(max, p.tier), 0);
}
