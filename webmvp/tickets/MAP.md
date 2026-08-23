# Map — Web MVP Prototype

**Label:** `wayfinder:map`  
**Status:** closed — MVP verified + mobile polish + live-stage chart (ticket 010)

---

## Frontier (open, unblocked)

_All core tickets complete._ Optional follow-ups: extra Twinkle lines, edit-from-song-view.

---

## All tickets

| # | Ticket | Status | Blocked by |
|---|---|---|---|
| 001 | [Scaffold Next.js app in webmvp](webmvp/001-scaffold-nextjs.md) | closed | — |
| 002 | [Song types and Twinkle preset](webmvp/002-types-and-preset.md) | closed | 001 |
| 003 | [Transposition engine (pure logic)](webmvp/003-transposition-engine.md) | closed | 002 |
| 004 | [localStorage persistence](webmvp/004-local-storage.md) | closed | 002 |
| 005 | [Home page — song list and Import button](webmvp/005-home-page.md) | closed | 001, 004 |
| 006 | [Import page — enter chords and auto-map](webmvp/006-import-page.md) | closed | 002, 003, 004 |
| 007 | [Song view — key picker and live transpose](webmvp/007-song-view.md) | closed | 003, 004, 006 |
| 008 | [End-to-end manual verification](webmvp/008-e2e-verification.md) | closed | 005, 006, 007 |
| 009 | [Mobile-responsive layout](webmvp/009-mobile-responsive.md) | closed | 008 |
| 010 | [Live-stage song view](webmvp/010-live-stage-song-view.md) | closed | 009 |
| 011 | [Fix [object Event] runtime error](webmvp/011-fix-object-event-runtime-error.md) | closed | 010 |
| 012 | [Live stage UI overhaul](webmvp/012-live-stage-ui-overhaul.md) | closed | 011 |

---

## Decisions so far

- **001 closed:** Next.js 15 scaffold in `webmvp/` with App Router, TypeScript, Tailwind v4, ESLint, and `src/` layout (`app`, `lib`, `components`, `data`).
- **002 closed:** `ChordSlot` / `Line` / `Song` types in `src/lib/types.ts`; `twinklePreset` in `src/data/presets.ts` (2 lines × 4 empty chord slots).
- **003 closed:** Pure transposition engine in `src/lib/engine.ts` — parse, degree map, transpose; all Twinkle test cases pass.
- **004 closed:** Browser persistence in `src/lib/storage.ts` — `getSongs` / `getSong` / `saveSong` via `lf-chord-app-songs` key; SSR-safe.
- **006 closed:** Import page at `/import` — Twinkle preset, chord inputs, auto-map on save, redirect to `/song/[id]`.
- **007 closed:** Song view at `/song/[id]` — `KeyPicker` + `SongLine`, live transpose via `transposeSlot`, fixed degree row.
- **005 closed:** MVP home — song list from `getSongs()`, Import Song button, links to song view; dev placeholders removed.
- **008 closed:** E2E verified — import/persist/transpose flow passes; engine + song-view scripts green.
- **009 closed:** Mobile-responsive layout — 375px-friendly, touch targets, slot-card chord display on phone, sticky KeyPicker.
- **010 closed:** Live-stage song view — numbers above lyrics (chart columns), sticky performance header, optional chord letters toggle.
- **011 closed:** `[object Event]` hardening — `formatError`, error boundaries, guarded key/toggle handlers; dev overlay often from stale `.next`/HMR.
- **012 closed:** Syllable `labels` on lines + lead-sheet UI — line 2 fixed (How/I/wonder/what), compact stage header, dark performance mode.

---

## Not yet specified

- Extra Twinkle lyrics lines (3–4) after core flow works
- Edit existing song from Song View
- Basic chord input validation UX

---

## Out of scope

- Supabase / cloud database
- User login
- Minor chords, 7ths, slash chords, capo
- Unit tests (optional after 008 passes)
- Flutter / mobile app
- Production polish and styling (mobile layout covered in 009)
