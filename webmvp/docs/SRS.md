# SRS — Web MVP (Simple)

## What this is

A small **Next.js web app** to test chord transposition. No database. No login. Data stays in the browser.

---

## User flow

```text
1. Click "Import Song"
2. Choose "Twinkle Twinkle Little Star"
3. Lyrics appear line by line
4. Enter one basic chord per lyric word/syllable slot
5. App auto-maps each chord → number (I, IV, V, etc.)
6. Save — song stays in the app
7. Open saved Twinkle Twinkle anytime
8. Change key → chords update automatically
```

---

## Features

### Must have

| # | Feature |
|---|---|
| F1 | **Import Song** button |
| F2 | Pick **Twinkle Twinkle Little Star** from a preset list |
| F3 | Show lyrics split into lines (editable slots) |
| F4 | **Manual chord input** per slot — basic chords only: `C`, `D`, `E`, `F`, `G`, `A`, `B` (+ `#`/`b` optional) |
| F5 | Set **original key** (default C) |
| F6 | **Auto-map** — app calculates degree (I, IV, V…) from chord + original key |
| F7 | **Save** — song stored in browser (localStorage), survives page refresh |
| F8 | **Song list** — see saved songs, tap Twinkle Twinkle to open |
| F9 | **Key picker** — change scale/key on saved song |
| F10 | **Live transpose** — chord letters update instantly; numbers stay the same |

### Not in this MVP

- Cloud / Supabase
- User accounts
- Admin portal
- Minor chords, 7ths, slash chords (G/B)
- Capo
- Lyrics editing after import (optional later)
- Mobile app

---

## Data per song

```text
Song
├── title              "Twinkle Twinkle Little Star"
├── originalKey        "C"
└── lines[]
    ├── lyrics         "Twinkle, twinkle, little, star"
    └── slots[]
        ├── chord      "C"        ← user enters
        ├── degree     "I"        ← app calculates
        └── quality    "major"    ← app assumes major for MVP
```

---

## Auto-map rule

When user enters a chord and original key is set:

```text
Input:  chord = F,  originalKey = C
Output: degree = IV, quality = major

Input:  chord = G,  originalKey = C
Output: degree = V,  quality = major
```

User enters letters → app stores numbers → transpose uses numbers.

---

## Transpose rule

When user picks a new key:

```text
Stored:  I   I   IV  I   (Twinkle, key C)
Pick G:  G   G   C   G
Pick D:  D   D   G   D
```

Numbers never change. Letters recalculate on the client.

---

## Persistence

- All saved songs in **localStorage**
- Key: `lf-chord-app-songs`
- Survives refresh; cleared if user clears browser data

---

## Basic chords allowed (MVP)

Major chords only:

```text
C   D   E   F   G   A   B
C#  D#  F#  G#  A#
Db  Eb  Gb  Ab  Bb
```

No: `Am`, `G7`, `F#m7`, `G/B`

---

## Twinkle Twinkle preset

On import, pre-fill lyrics (user enters chords):

```text
Line 1: Twinkle, twinkle, little, star     → 4 chord slots
Line 2: How I wonder what you are          → 4 chord slots
Line 3: Up above the world so high         → 4 chord slots
Line 4: Like a diamond in the sky          → 4 chord slots
(repeat or stop at 2 lines for minimal MVP — see PLAN.md)
```

Expected result in key C: `C C F C` / `F C G C`

---

## Success criteria

- [ ] Import Twinkle Twinkle, enter chords, save
- [ ] Close tab, reopen — song still there
- [ ] Open song, change C → G — chords update correctly
- [ ] Degree row shows I, IV, V and does not change when key changes
- [ ] Works in Chrome without errors

---

## One rule

> **User enters chord letters once. App maps to numbers. Key change uses numbers only.**
