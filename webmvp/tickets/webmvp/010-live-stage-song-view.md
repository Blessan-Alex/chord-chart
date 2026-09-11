---
id: webmvp-010
title: Live-stage song view (numbers above lyrics)
status: closed
type: prototype
labels: [webmvp, prototype, ui, live]
blocked_by: [webmvp-009]
blocks: []
---

## Goal

Rehaul song view for live on-stage use: numbers anchored above lyrics, key in sticky header only, optional chord letters toggle.

## Acceptance criteria

- [x] Default view: numbers above lyrics only, word-aligned columns
- [x] Changing key does NOT change numbers on chart (only header key updates)
- [x] Readable on 375px phone at arm's length
- [x] Sticky key picker on mobile
- [x] npm run build passes
- [x] Full flow still works: import → save → song view

## Resolution

Replaced spreadsheet-style rows with inline chart columns in `ChordLine` — degrees above lyric words via `ChordRow`. Sticky song header with key selector, title, and chords/numbers toggle. `transposeChord` used for chords view; `chordToDegree` for numbers view. `npm run build` passes.
