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

Live-stage UI iteration: compact sticky header, chords/numbers toggle, `ChordRow` with `ch` positioning. Import page: interactive chord editor, sticky Save on mobile. Song view: dark-mode-friendly chart styling, `max-w-2xl`. Superseded by current `ChordRow` / `InteractiveEditor` architecture (see `MAP.md`).
