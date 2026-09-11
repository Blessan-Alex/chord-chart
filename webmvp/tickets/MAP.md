# Map — Web MVP Prototype

**Label:** `wayfinder:map`  
**Status:** closed — core MVP verified; architecture aligned with `docs/` tree

---

## Current architecture

### Data model (`src/lib/types.ts`)

```
Song → Section[] → LyricLine → ChordMark { chord, position }
```

- **Song** — `id`, `title`, `originalKey` (`Key` union), `sections`
- **Section** — `label`, `lines`
- **LyricLine** — `lyrics`, `chords`
- **ChordMark** — chord string at a character `position` in the lyric line

Presets live in `src/data/presets.ts` as `SongPreset` (with `presetId` for routing only — not stored on `Song`).

### Components

| Component | Role |
|---|---|
| `HomePage` | Song list (saved + presets), delete, link to import |
| `ChordLine` | One lyric line: chord row + lyrics |
| `ChordRow` | Absolutely positioned chords in `ch` units |
| `InteractiveEditor` | Import step 2 — click-to-place chords, diatonic palette |

### Engine (`src/lib/engine.ts`)

| Export | Purpose |
|---|---|
| `transposeChord` | Transpose a chord between keys |
| `chordToDegree` | Scale-degree display (numbers view) |
| `getDiatonicChords` | 6 diatonic triads for any `Key` |
| `isValidChord` | Parse guard for chord input |
| `ALL_KEYS` / `Key` | 12 major keys |

### Storage (`src/lib/storage.ts`)

- **Key:** `lf-chord-app-songs` in `localStorage`
- **API:** `getSongs`, `getSong`, `saveSong`, `deleteSong`
- **Validation:** `validateSong` called before every write

### Routes

| Path | Page |
|---|---|
| `/` | Home — presets + saved songs |
| `/import` | Paste lyrics → place chords → save |
| `/song/[id]` | Song view — transpose + chords/numbers toggle |

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
| 013 | [Multi-song presets + no duplicates](webmvp/013-multi-song-presets.md) | closed | 012 |

---

## Decisions so far

- **001 closed:** Next.js 15 scaffold in `webmvp/` with App Router, TypeScript, Tailwind v4, ESLint, and `src/` layout.
- **002 closed:** `Song` / `Section` / `LyricLine` / `ChordMark` types; Twinkle preset in `src/data/presets.ts`.
- **003 closed:** Pure transposition engine in `src/lib/engine.ts` — `parseChord`, `transposeChord`, `chordToDegree`.
- **004 closed:** Browser persistence via `lf-chord-app-songs`; SSR-safe `getSongs` / `saveSong`.
- **005 closed:** Home page lists saved songs and presets; Import link.
- **006 closed:** Import flow — paste lyrics, `InteractiveEditor` for chord placement, save to localStorage.
- **007 closed:** Song view at `/song/[id]` — `ChordLine` + `ChordRow`, live transpose, chords/numbers toggle.
- **008 closed:** E2E verified — import/persist/transpose flow passes.
- **009–012 closed:** Mobile layout, live-stage chart UI iterations (superseded by current `ChordRow` renderer).
- **013 closed:** 10 worship presets in `SONG_PRESETS`; preset routes use `presetId` as URL id.

---

## Not yet specified

- Edit existing song from song view
- Replace `confirm()` delete with proper modal
- Firebase migration (see `docs/02`–`docs/05`)

---

## Out of scope (MVP)

- Supabase / cloud database (until Firebase migration)
- User login
- Unit test framework in CI (optional scripts in `scripts/`)
