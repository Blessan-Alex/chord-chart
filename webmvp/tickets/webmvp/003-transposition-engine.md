---
id: webmvp-003
title: Transposition engine (pure logic)
status: closed
type: prototype
labels: [webmvp, prototype, logic]
blocked_by: [webmvp-002]
blocks: [webmvp-006, webmvp-007]
---

## Question

Does chord → degree auto-mapping and key transposition work correctly for basic major chords (C, F, G in key C)?

## Goal

Pure TypeScript module — **no React, no localStorage**. This is the throwaway-to-keep logic core per `/prototype` LOGIC branch.

Create `src/lib/engine.ts`:

| Function | Purpose |
|---|---|
| `parseBasicChord(input)` | Parse `C`, `F#`, `Bb` → root + `major` |
| `chordToDegree(chord, originalKey)` | `F` in key `C` → `IV` |
| `chordFromDegree(degree, quality, targetKey)` | `IV` in key `G` → `C` |
| `transposeSlot(slot, targetKey)` | Use stored degree + quality → display chord |

## Test cases (manual or quick script)

| Input | Expected |
|---|---|
| `C` in key C → degree | `I` |
| `F` in key C → degree | `IV` |
| `G` in key C → degree | `V` |
| `I` in key G → chord | `G` |
| `IV` in key G → chord | `C` |
| `V` in key G → chord | `D` |
| Full line `C C F C` key C → G | `G G C G` |

## Acceptance criteria

- [x] Engine file has zero UI imports
- [x] All test cases above pass
- [x] Supports 12 major keys
- [x] Major chords only (no Am, G7)

## References

- [`webmvp/docs/SRS.md`](../../webmvp/docs/SRS.md) — Auto-map rule, Transpose rule
- `/prototype` LOGIC — isolate pure module

## Resolution

**Verdict: pass.** Added `src/lib/engine.ts` with `parseBasicChord`, `chordToDegree`, `chordFromDegree`, `transposeSlot`, and helper `transposeChords`. Pure TypeScript — no React or localStorage. Supports all 12 major keys; major quality only. All ticket test cases pass (verified via `scripts/verify-engine.ts`). Home page shows live check: `C C F C` → `G G C G` in key G. Non-diatonic chords throw a clear error (edge case for later UI validation).
