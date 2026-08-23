---
id: webmvp-002
title: Song types and Twinkle preset
status: closed
type: task
labels: [webmvp, task]
blocked_by: [webmvp-001]
blocks: [webmvp-003, webmvp-004, webmvp-006]
---

## Goal

Define the song data shape and hard-code the Twinkle Twinkle template (lyrics + empty chord slots).

## Work

Create:

- `src/lib/types.ts` — `ChordSlot`, `Line`, `Song`
- `src/data/presets.ts` — Twinkle Twinkle with 2 lines, 4 slots each

```typescript
// ChordSlot: { chord: string, degree?: string, quality?: string }
// Line: { lyrics: string, slots: ChordSlot[] }
// Song: { id, title, originalKey, lines[] }
```

Twinkle lines (MVP):

```text
Line 1: "Twinkle, twinkle, little, star"     → 4 empty slots
Line 2: "How I wonder what you are"          → 4 empty slots
```

Expected chords when filled: `C C F C` / `F C G C` in key C.

## Acceptance criteria

- [x] Types export cleanly, no React imports
- [x] Preset exports `twinklePreset` with title + lyrics + 8 empty chord slots
- [x] Can import preset from a page without errors

## References

- [`webmvp/docs/SRS.md`](../../webmvp/docs/SRS.md) — Data per song, Twinkle preset
- [`webmvp/docs/PLAN.md`](../../webmvp/docs/PLAN.md) — Step 2–3

## Resolution

Created `src/lib/types.ts` with plain TypeScript exports: `ChordSlot`, `Line`, and `Song` (no React). Created `src/data/presets.ts` exporting `twinklePreset` — title "Twinkle Twinkle Little Star", originalKey "C", two lyric lines with four empty chord slots each (8 total). Verified compile via `npm run build` and temporary import in `src/app/page.tsx`.
