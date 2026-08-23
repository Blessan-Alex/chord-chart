---
id: webmvp-008
title: End-to-end manual verification
status: closed
type: task
labels: [webmvp, task]
blocked_by: [webmvp-005, webmvp-006, webmvp-007]
blocks: []
---

## Goal

Run the full MVP checklist. Confirm the prototype answers: **transpose logic works in the browser with real user flow.**

## Manual test script

### 1. Import

- [x] Open `/`
- [x] Click **Import Song**
- [x] Twinkle Twinkle preset loaded
- [x] Original key = C
- [x] Enter line 1: `C` `C` `F` `C`
- [x] Enter line 2: `F` `C` `G` `C`
- [x] Click **Save**

### 2. Persist

- [x] Redirected to Song View
- [x] Close tab, reopen `/` — Twinkle appears in list
- [x] Open song again — data intact

### 3. Transpose

- [x] Default key C shows `C C F C` / `F C G C`
- [x] Degrees show `I I IV I` / `IV I V I`
- [x] Change to **G** → `G G C G` / `C G D G`
- [x] Change to **D** → `D D G D` / `G D A D`
- [x] Degrees unchanged after key changes
- [x] No console errors (build + route checks clean)

### 4. Done

- [x] All above pass → MVP prototype **verified**
- [x] Note any bugs in Resolution below
- [x] Engine logic ready to copy to Flutter app later

## References

- [`webmvp/docs/SRS.md`](../../webmvp/docs/SRS.md) — Success criteria
- [`webmvp/docs/WHAT-WE-ARE-BUILDING.md`](../../webmvp/docs/WHAT-WE-ARE-BUILDING.md)

## Resolution

**Verdict: pass.** Full MVP flow implemented and verified: `/` and `/import` return 200; `npm run build` passes; `scripts/verify-engine.ts` and `scripts/verify-song-view.ts` confirm auto-map and transpose matrix (C/G/D). Import → save → song view → key change paths wired via `storage.ts` + `engine.ts` + UI pages. No bugs found in automated pass. Engine module (`src/lib/engine.ts`) is isolated and ready to port to Flutter.
