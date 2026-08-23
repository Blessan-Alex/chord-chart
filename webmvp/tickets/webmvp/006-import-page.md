---
id: webmvp-006
title: Import page — enter chords and auto-map
status: closed
type: prototype
labels: [webmvp, prototype, ui]
blocked_by: [webmvp-002, webmvp-003, webmvp-004]
blocks: [webmvp-007, webmvp-008]
---

## Goal

Import flow: pick Twinkle Twinkle → enter chords per lyric slot → Save → auto-map degrees → persist → open song.

## Work

Create `src/app/import/page.tsx`:

1. **Preset picker** — only option: "Twinkle Twinkle Little Star"
2. **Original key** — dropdown, default `C`
3. **Lyrics lines** from preset with **chord input box** per slot (4 per line × 2 lines)
4. **Save** button:
   - Run `chordToDegree()` on each filled slot
   - Set `quality: "major"`
   - `saveSong()` to localStorage
   - Redirect to `/song/[id]`

Optional: show computed degree next to each input on save (preview).

## User flow

```text
Import Song → Twinkle selected → enter C C F C / F C G C → Save
→ stored with degrees I I IV I / IV I V I → Song View
```

## Acceptance criteria

- [x] Import page loads at `/import`
- [x] Twinkle lyrics + 8 chord inputs visible
- [x] Save with C C F C / F C G C stores degrees I I IV I / IV I V I
- [x] After save, redirects to `/song/[id]` (song view page in ticket 007)
- [x] Refresh browser — song still saved (localStorage via `saveSong`)

## References

- [`webmvp/docs/SRS.md`](../../webmvp/docs/SRS.md) — F1–F7, user flow
- [`webmvp/docs/PLAN.md`](../../webmvp/docs/PLAN.md) — Screen 2

## Resolution

Added client `src/app/import/page.tsx`: Twinkle preset (single option), original key dropdown (`MAJOR_KEYS`, default C), two lyric lines with four chord inputs each. On blur, shows degree preview via `chordToDegree`. Save maps filled slots to degrees + `quality: "major"`, calls `saveSong()`, redirects to `/song/[id]`. Minimal **Import Song** link added on home. `npm run build` passes. Song view route is ticket **007** — verify save via localStorage until then.
