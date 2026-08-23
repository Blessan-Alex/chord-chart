---
id: webmvp-004
title: localStorage persistence
status: closed
type: task
labels: [webmvp, task]
blocked_by: [webmvp-002]
blocks: [webmvp-005, webmvp-006, webmvp-007]
---

## Goal

Save and load songs in the browser so data survives page refresh.

## Work

Create `src/lib/storage.ts`:

| Function | Purpose |
|---|---|
| `getSongs()` | Return all saved songs |
| `getSong(id)` | Return one song by id |
| `saveSong(song)` | Upsert song to storage |
| `deleteSong(id)` | Optional — not required for MVP |

- Storage key: `lf-chord-app-songs`
- Guard for SSR: only access `localStorage` in client components
- Generate song `id` on first save (crypto.randomUUID or simple timestamp)

## Acceptance criteria

- [x] Save a song → refresh page → song still returned by `getSongs()`
- [x] Multiple songs can coexist
- [x] No crash when localStorage is empty (returns `[]`)
- [x] Works in browser client components only

## References

- [`webmvp/docs/SRS.md`](../../webmvp/docs/SRS.md) — Persistence section

## Resolution

Added `src/lib/storage.ts` with `getSongs()`, `getSong(id)`, and `saveSong(song)` using key `lf-chord-app-songs`. SSR-safe: returns `[]` when `window` is undefined; malformed JSON also returns `[]`. `saveSong` upserts by id and generates `crypto.randomUUID()` when id is missing. Temporary client `StorageVerify` component on home page saves a test Twinkle song and shows saved count (persists across refresh). `npm run build` passes.
