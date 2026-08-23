---
id: webmvp-007
title: Song view — key picker and live transpose
status: closed
type: prototype
labels: [webmvp, prototype, ui]
blocked_by: [webmvp-003, webmvp-004, webmvp-006]
blocks: [webmvp-008]
---

## Goal

Open a saved song, change key, see chords update instantly. Degree row stays fixed.

## Work

Create `src/app/song/[id]/page.tsx` + components:

**`KeyPicker`** — dropdown: 12 major keys (C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B)

**`SongLine`** — per line, three rows:

```text
G        G        C        G      ← transposed chords (from engine)
I        I        IV       I      ← degrees (from stored data, never changes)
Twinkle, twinkle, little, star   ← lyrics
```

- Load song by `id` from localStorage
- Default key = song's `originalKey`
- On key change: re-run `transposeSlot()` for each slot — **no save needed**, display only
- **Edit** link → `/import?id=...` (optional; can defer)

## Test matrix

| Key | Line 1 chords | Line 2 chords |
|---|---|---|
| C | C C F C | F C G C |
| G | G G C G | C G D G |
| D | D D G D | G D A D |

Degrees always: `I I IV I` / `IV I V I`

## Acceptance criteria

- [x] Song loads from localStorage by id
- [x] Key picker changes all chord letters instantly
- [x] Degree row does not change when key changes
- [x] Lyrics visible under each line
- [x] Invalid/missing id shows friendly error

## References

- [`webmvp/docs/SRS.md`](../../webmvp/docs/SRS.md) — F9, F10, Transpose rule
- [`webmvp/docs/PLAN.md`](../../webmvp/docs/PLAN.md) — Screen 3

## Resolution

Added `KeyPicker` and `SongLine` components plus client `src/app/song/[id]/page.tsx`. Loads song via `getSong(id)` on mount; default key is `originalKey`. Key changes re-render transposed chords via `transposeSlot` (display only, degrees from stored data). Friendly not-found state for invalid ids. Test matrix C/G/D verified in `scripts/verify-song-view.ts`. Import → Save → Song View loop works; `npm run build` passes.
