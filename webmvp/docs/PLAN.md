# Plan — Web MVP Build

**Folder:** `webmvp/`  
**Stack:** Next.js + TypeScript + localStorage  
**Time:** 1–2 days  

---

## What we are making

```text
Import Song  →  Enter chords  →  Auto-map degrees  →  Save locally  →  Change key  →  See transpose
```

---

## Screens (3 only)

### 1. Home
- List of saved songs (title + original key)
- **Import Song** button
- Tap a song → Song View

### 2. Import / Edit
- Dropdown: **Twinkle Twinkle Little Star** (only preset for now)
- Original key picker (default C)
- Lyrics lines with chord input boxes under each word/syllable
- **Save** button
- On save: auto-map degrees, write to localStorage, go to Song View

### 3. Song View
- Song title + original key
- Key picker (12 major keys)
- Each line shows:
  ```text
  G        G        C        G      ← transposed chords
  I        I        IV       I      ← degrees (fixed)
  Twinkle, twinkle, little, star   ← lyrics
  ```
- **Edit** button → back to Import/Edit

---

## Build steps

### Step 1 — Scaffold
```bash
cd webmvp
npx create-next-app@latest . --typescript --app --eslint --tailwind
npm run dev
```

### Step 2 — Types (`src/lib/types.ts`)
```typescript
ChordSlot { chord, degree, quality }
Line      { lyrics, slots[] }
Song      { id, title, originalKey, lines[] }
```

### Step 3 — Preset (`src/data/presets.ts`)
Twinkle Twinkle lyrics split into 4-slot lines (start with 2 lines for fastest test).

### Step 4 — Engine (`src/lib/engine.ts`)
Pure functions, no React:
- `chordToDegree(chord, key)` → degree string
- `transposeChord(degree, quality, targetKey)` → display letter
- `parseBasicChord(input)` → root + quality (major only)

### Step 5 — Storage (`src/lib/storage.ts`)
- `getSongs()` / `saveSong(song)` / `getSong(id)`
- localStorage JSON

### Step 6 — Pages & components

| File | Job |
|---|---|
| `app/page.tsx` | Home — song list + Import button |
| `app/import/page.tsx` | Import/edit form |
| `app/song/[id]/page.tsx` | Song view + key picker |
| `components/ChordInput.tsx` | Single chord text box |
| `components/KeyPicker.tsx` | 12-key dropdown |
| `components/SongLine.tsx` | Chords + degrees + lyrics row |

### Step 7 — Wire flow
```text
Import → fill chords → Save (auto-map + localStorage) → Song View
Home → tap song → Song View → change key → re-render
```

### Step 8 — Test manually
| Test | Expected |
|---|---|
| Import Twinkle, enter C C F C / F C G C, save | Degrees I I IV I / IV I V I |
| Refresh page | Song still in list |
| Key → G | G G C G / C G D G |
| Key → D | D D G D / G D A D |

---

## Folder structure

```text
webmvp/
├── SRS.md
├── PLAN.md
├── src/
│   ├── app/
│   │   ├── page.tsx              Home
│   │   ├── import/page.tsx       Import + enter chords
│   │   └── song/[id]/page.tsx    View + transpose
│   ├── components/
│   │   ├── ChordInput.tsx
│   │   ├── KeyPicker.tsx
│   │   └── SongLine.tsx
│   ├── data/
│   │   └── presets.ts            Twinkle template
│   └── lib/
│       ├── types.ts
│       ├── engine.ts             transpose + auto-map
│       └── storage.ts            localStorage
```

---

## Twinkle preset (minimal — 2 lines)

```text
Line 1: "Twinkle, twinkle, little, star"     [ _ ] [ _ ] [ _ ] [ _ ]
Line 2: "How I wonder what you are"            [ _ ] [ _ ] [ _ ] [ _ ]
```

User fills: `C  C  F  C` / `F  C  G  C`

Add lines 3–4 later if needed.

---

## Auto-map on save

```text
For each slot:
  user chord "F" + originalKey "C"
    → degree "IV"
    → quality "major"
  store both chord + degree
```

Display in Song View uses **degree** for transpose, not stored letter.

---

## Out of scope (do not build yet)

- Backend / Supabase
- Multiple presets beyond Twinkle
- chord validation beyond basic major list
- Unit tests (optional after manual test passes)
- Pretty styling beyond readable layout

---

## Done when

1. Import button works  
2. Twinkle preset loads with chord inputs  
3. Save persists after refresh  
4. Key change transposes all chords live  
5. Numbers row stays fixed  

Then copy `engine.ts` logic into the full Flutter app later.
