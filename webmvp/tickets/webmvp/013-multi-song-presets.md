---
id: webmvp-013
title: Multiple worship song presets, no duplicate list entries
status: closed
type: prototype
labels: [webmvp, prototype, presets, storage]
blocked_by: [webmvp-012]
blocks: []
---

## Goal

Musicians see a song list of unique saved songs (up to ~10 worship presets).
Admin/user picks a preset, enters chords once, saves — song appears on Home.
Re-saving same song updates it, does NOT duplicate.
Song view works unchanged (numbers + key picker).

## Acceptance criteria

- [x] Import dropdown shows 10 worship presets
- [x] Save Amazing Grace → appears on Home
- [x] Save Twinkle + Amazing Grace + Good Good Father → 3 unique rows on Home
- [x] Save Twinkle again → still 1 Twinkle row (updated chords)
- [x] Open any saved song → song view + key change works
- [x] Major chords only in engine (unchanged)
- [x] npm run build passes

## Resolution

Expanded `src/data/presets.ts` with `SONG_PRESETS` (10 worship songs) and `getPresetById()`. Presets route via `presetId` URL; saved songs use uuid `id`. Home page: alphabetical sort + song count. (`Song.presetId` removed in Phase 2 — presets are read-only seed data.)
