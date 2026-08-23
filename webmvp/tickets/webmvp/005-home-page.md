---
id: webmvp-005
title: Home page — song list and Import button
status: closed
type: prototype
labels: [webmvp, prototype, ui]
blocked_by: [webmvp-001, webmvp-004]
blocks: [webmvp-008]
---

## Goal

Landing page: list saved songs + **Import Song** button.

## Work

Create `src/app/page.tsx` (client component or hybrid):

- On load: read songs from `getSongs()`
- Show each song: title + original key
- Tap song row → navigate to `/song/[id]`
- **Import Song** button → navigate to `/import`
- Empty state: "No songs yet — Import Song"

Minimal styling — readable list, one primary button.

## Acceptance criteria

- [x] Home loads at `/`
- [x] Import Song button goes to `/import`
- [x] Saved songs appear in list after import flow (test after 006)
- [x] Clicking a song opens Song View route

## References

- [`webmvp/docs/PLAN.md`](../../webmvp/docs/PLAN.md) — Screen 1
- `/prototype` UI — minimal, no polish

## Resolution

Replaced dev placeholder home with client `HomePage` component: loads `getSongs()` on mount, lists title + original key, links rows to `/song/[id]`, **Import Song** button to `/import`, empty state when no songs. Removed `StorageVerify` and engine-check dev UI. `npm run build` passes.
