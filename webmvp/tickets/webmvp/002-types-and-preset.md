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

- `src/lib/types.ts` — `ChordMark`, `LyricLine`, `Section`, `Song`
- `src/data/presets.ts` — Twinkle Twinkle with 2 lines, 4 slots each

```typescript
// ChordMark: { chord: string, position: number }
// LyricLine: { lyrics: string, chords: ChordMark[] }
// Song: { id, title, originalKey, sections: Section[] }
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

- [`docs/02-data-model-firestore-schema.md`](../../../docs/02-data-model-firestore-schema.md) — Data model

## Resolution

Created `src/lib/types.ts` with section-based song types (no React). Created `src/data/presets.ts` with Twinkle preset — title "Twinkle Twinkle Little Star", originalKey "C", chord marks at character positions. Verified compile via `npm run build`.
