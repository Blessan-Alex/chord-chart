---
id: webmvp-012
title: Live stage UI overhaul (syllable labels + lead sheet)
status: closed
type: prototype
labels: [webmvp, prototype, ui, live]
blocked_by: [webmvp-011]
blocks: []
---

## Goal

Fix broken line 2 alignment and rehaul song/import UI for live on-stage use — lead sheet layout, not admin form.

## Acceptance criteria

- [x] Line 2 shows How / I / wonder / what under degrees (explicit labels)
- [x] NO "Slot N" anywhere
- [x] NO full sentence crammed under one column
- [x] Numbers text-2xl+ on song view
- [x] Compact sticky key header (~80px default)
- [x] Import: 4-column chart builder with meaningful labels
- [x] npm run build passes

## Resolution

Added `labels?: string[]` to `Line` type and `getSlotLabels()` in `lineLabels.ts` with comma/space fallback for legacy songs. Twinkle preset now has explicit syllable labels for both lines. `SongLine` uses 4-col grid (no horizontal scroll), large degrees, labels below — no duplicate lyric row. `PerformanceHeader` compact: key + options menu (title, chord toggle hidden). Import page: chart-builder layout, sticky Save on mobile. Song view: `performance-mode` dark theme, `max-w-2xl`. Verified via `scripts/verify-line-labels.ts`.
