# Beta Feedback — Rephrased & Implementation Plan

> Source: beta tester notes (original intent preserved, wording cleaned up).
> Status: planning document — not yet implemented unless marked done elsewhere.

---

## Summary of what testers are asking for

Beta feedback falls into three buckets:

| Bucket | Count | Examples |
|--------|-------|----------|
| **UI polish / deduplication** | 4 items | Remove duplicate controls, clearer labels, hide permanent zoom % |
| **Library scale (10k+ songs)** | 2 items | Language tags, lyric search |
| **Performance / musician mode** | 3 items | Lower zoom floor, fullscreen, slower autoscroll on mobile |
| **Admin clarity** | 1 item | Simpler editor tab names |
| **Advanced (music theory)** | 1 item | Minor-key context in transpose UI |

Most UI items are **fixes to existing features**. Tags, lyric search, fullscreen, wake lock, and minor-key mode are **new or expanded features** with different complexity.

---

## Feedback items (rephrased)

### 1. Song tags & language categories

**What they mean:** As the library grows (target: ~10,000 songs), scrolling becomes unusable. Songs need **categories** — especially **language** (Hindi, Malayalam, Tamil, English, Marathi, Telugu) — so musicians can filter quickly instead of hunting by scroll.

**Main issue:** No structured categorization UI; library will not scale by title scroll alone.

**Type:** New feature (data model partially exists).

**Current codebase:**
- `tags: string[]` already exists on songs and in `songIndex`.
- Search can match tags as plain text, but there is **no tag editor, no language filter UI, no tag chips**.

**Proposed fix:**
- Standardize language tags (e.g. `lang:malayalam`, `lang:hindi`) or a dedicated `language` field.
- Admin/import/edit UI to assign tags.
- Home library: language filter chips or dropdown + optional multi-tag filter.
- Show tags on song rows (optional).

**Feasibility:** High. Fits existing `songIndex` client-side filter pattern. No new Firestore reads per keystroke.

---

### 2. Rename “Auto” → clearer autoscroll control

**What they mean:** The label **“Auto”** is unclear. Prefer **“Scroll”** or an **autoscroll play icon** to save space and make intent obvious.

**Main issue:** Confusing label; duplicated in two places on mobile (see #3).

**Type:** UI fix (copy + icon).

**Current codebase:** `SongControlBar` and `PerformanceBottomBar` both use “Auto”. `AutoscrollBar` already uses play/pause icons when active.

**Proposed fix:**
- Rename toggle to **“Scroll”** or use ▶ icon only with `aria-label="Autoscroll"`.
- Remove top-bar duplicate on mobile (see Phase 1).

---

### 3. Deduplicate song control bar (mobile)

**What they mean:**
- **Transpose ±** and **key picker** appear in both the top bar and bottom navbar — keep **bottom only** on mobile; remove duplicate from top.
- Remove **“from C”** (original key hint) under the current key — show **only the current key**, larger.
- **Autoscroll** should not appear twice (top + bottom) — bottom only on mobile.
- With ± removed from bottom (moved/consolidated), use freed space to make the **theme (◐) icon slightly larger**.

**Main issue:** Redundant controls clutter mobile performance UI.

**Type:** UI fix / layout refactor.

**Current codebase:**
- Desktop top bar: ±, key, zoom, Auto.
- Mobile top bar: key, Chords/Numbers, Auto.
- Mobile bottom bar: ±, key + “from {originalKey}”, zoom ±, %, theme, Auto.

**Proposed fix:**
- Mobile: single control surface in `PerformanceBottomBar`.
- Top `SongControlBar` on mobile: back, title, playlist nav only (or Chords/Numbers if not moved).
- Key button opens existing `KeySelectModal`; remove “from X” subtitle.
- One autoscroll entry point on mobile.

---

### 4. Zoom percentage — show only on change

**What they mean:** Permanent **85%** (or similar) in the navbar is unnecessary. Show zoom level **only when the user pinches or taps ±** — brief toast/fade overlay.

**Main issue:** Visual noise; percentage is only useful at moment of change.

**Type:** UI fix (partially exists).

**Current codebase:**
- Permanent `%` in `SongControlBar` and `PerformanceBottomBar`.
- Transient toast already exists in `ChordChartViewport` via `useChartZoom` (~1.2s on pinch/button).

**Proposed fix:**
- Remove permanent `%` from both bars.
- Rely on existing transient indicator (extend duration slightly if needed).

---

### 5. Search lyrics, not just title

**What they mean:** Search should find songs by **any word in the lyrics**, not only title/artist. Concern: will this overload Firestore or the client?

**Main issue:** Title-only (plus artist/tags) search is too limited for real use.

**Type:** New feature (index extension).

**Current codebase:**
- Client-side search over cached `songIndex` chunks.
- Matches: `title`, `artist`, `tags` — **not lyrics**.

**Options (pros / cons):**

| Approach | Pros | Cons |
|----------|------|------|
| **A. Denormalize lyric snippet into `songIndex`** | Zero extra reads per search; same pattern as today | Larger index payload; rebuild on edit; 10k songs needs chunking review |
| **B. Full lyric text in index entry** | Complete lyric search | Index size may exceed practical localStorage / initial load budget |
| **C. Server-side search (Algolia / Typesense / CF)** | Scales to huge libraries | New infra, cost, sync pipeline |
| **D. Search only first line / chorus** | Small index bump | Incomplete matches |

**Recommendation:** Start with **A** — store a normalized `searchText` field (title + artist + tags + flattened lyric text, truncated if needed) in each `songIndex` entry. Rebuild index on song save. Client filter unchanged.

**Feasibility:** Medium. Requires index schema change + rebuild script + admin awareness of index size (~10k songs).

---

### 6. Zoom below 85% + performance fullscreen

**What they mean:**
- Allow zoom **below 85%** so more of the song fits on screen (chords can shrink).
- **Fullscreen performance mode**: hide chrome, show lyrics + chords only; controls: pinch zoom, next song in playlist, exit fullscreen.
- While fullscreen: **prevent screen sleep** (wake lock) even if device timeout is 5 seconds.

**Main issue:** Current min zoom (85%) limits how much fits on phone; no true performance fullscreen or wake lock.

**Type:** New feature + config change.

**Current codebase:**
- `CHART_SCALE_MIN = 0.85` in `performancePreferences.ts`.
- Autoscroll already hides some chrome; not the same as Fullscreen API.
- No `navigator.wakeLock` usage.

**Proposed fix:**
- Lower min zoom to **60–70%** (tune with testers).
- Add **Fullscreen** toggle on song view (mobile-first).
- On enter: `document.documentElement.requestFullscreen()` (with iOS Safari fallbacks — `webkitEnterFullscreen` on video wrapper or fixed overlay pseudo-fullscreen).
- Optional: `navigator.wakeLock.request('screen')` while fullscreen/autoscroll active; release on exit.
- Exit control always visible (corner icon).

**Feasibility:** Medium. Wake lock unsupported on some iOS versions; document fallback (“keep screen on” user setting).

---

### 7. Admin editor — simpler wording

**What they mean:** **“ChordPro source”** and **“Visual fine-tune”** are too technical for church admins.

**Main issue:** Admin UX jargon.

**Type:** Copy fix.

**Current codebase:** `InteractiveEditor.tsx` tabs; edit page subtitle.

**Proposed labels (example):**

| Current | Suggested |
|---------|-----------|
| ChordPro source | **Paste lyrics & chords** |
| Visual fine-tune | **Adjust chord positions** |

Subtitle: *“Paste or type your song, then tap to place chords on the lines.”*

---

### 8. Autoscroll — slower speeds on mobile

**What they mean:** At **0.7x** on mobile the chart barely moves; **0.8x** is still too fast when increased. Need **finer, slower** speed steps at the low end.

**Main issue:** Speed curve (`20 px/s × speed`, range 0.3–2.0) not tuned for mobile.

**Type:** Bug fix / UX tuning.

**Current codebase:** `useAutoscroll.ts` — linear speed, same on all devices.

**Proposed fix:**
- Lower minimum speed (e.g. **0.1–0.2**) with **0.05 steps** below 1.0.
- Or use separate mobile multiplier (e.g. `0.5×` effective rate on coarse pointer).
- Default mobile autoscroll speed **0.4–0.5** instead of 0.7.

---

### 9. Advanced — minor key / minor scale songs 9doubt about gtthis part , dont implement yet without further discussion 

**What they mean:** Many songs are in **minor keys**. UI only shows **major keys** (C, D, E…). When playing minor songs, there is no way to set or transpose in **minor context** (e.g. Am, Em) or see minor-appropriate chord palette.

**Main issue:** Key picker and diatonic palette are major-centric.

**Type:** New feature (music theory).

**Current codebase:**
- `ALL_KEYS` = 12 major keys only.
- Individual minor **chords** transpose correctly (`Am` → `Bm`).
- `getDiatonicChords()` returns major-key degrees (I, IV, V, vi…).
- No minor key mode in `KeySelectModal`.

**Proposed fix (phased):**
1. Allow `originalKey` values like `Am`, `Em` (parse major/minor in `keyUtils`).
2. Key picker: toggle **Major / Minor** or show 12 minor keys in second row.
3. Diatonic palette adapts to minor scale when key is minor.
4. Numbers mode uses minor root for degree calculation.

**Feasibility:** Medium–high engineering; needs theory review + test coverage.

---

## Implementation phases

Phases ordered by **impact vs effort**. Each phase is shippable independently.

---

### Phase 1 — Mobile performance bar cleanup (UI fixes)

**Goal:** Less clutter, clearer controls on song view (mobile).

| Task | Type | Files (likely) |
|------|------|----------------|
| Remove duplicate transpose ± / Auto from mobile top bar | Fix | `SongControlBar.tsx`, `song/[id]/page.tsx` |
| Keep transpose + key + autoscroll in bottom bar only | Fix | `PerformanceBottomBar.tsx` |
| Remove “from {originalKey}” subtitle; enlarge current key | Fix | `PerformanceBottomBar.tsx` |
| Rename “Auto” → “Scroll” or play icon; single entry point | Fix | `PerformanceBottomBar.tsx`, `SongControlBar.tsx` |
| Remove permanent zoom %; toast-only indicator | Fix | `PerformanceBottomBar.tsx`, `SongControlBar.tsx` |
| Slightly enlarge theme toggle icon | Fix | `PerformanceBottomBar.tsx` |

**Acceptance:** Mobile song view has one control strip; zoom % only flashes on change; no duplicate Auto/transpose.

**Estimate:** Small (1–2 days).

---

### Phase 2 — Autoscroll speed tuning (bug fix)

**Goal:** Usable slow scroll on phones.

| Task | Type | Files (likely) |
|------|------|----------------|
| Extend slow end of speed range (min 0.1–0.2, finer steps) | Fix | `useAutoscroll.ts`, `AutoscrollBar.tsx` |
| Lower default speed on mobile / coarse pointer | Fix | `useAutoscroll.ts` |
| Optional: device-specific speed multiplier | Fix | `useAutoscroll.ts` |

**Acceptance:** Tester confirms readable scroll at lowest speeds on mobile.

**Estimate:** Small (< 1 day).

---

### Phase 3 — Admin copy & zoom floor (quick wins)

**Goal:** Admins understand the editor; musicians see more chart on screen.

| Task | Type | Files (likely) |
|------|------|----------------|
| Rename editor tabs to plain language | Fix | `InteractiveEditor.tsx`, `edit/page.tsx`, `import/page.tsx` |
| Lower `CHART_SCALE_MIN` to ~0.65–0.70 | Fix | `performancePreferences.ts` |

**Acceptance:** Non-technical admin can identify both editor modes; zoom out shows more lines.

**Estimate:** Small (< 1 day).

---

### Phase 4 — Language tags & library filters (scale)

**Goal:** Find songs among thousands by language/category.

| Task | Type | Files (likely) |
|------|------|----------------|
| Define standard language tags or `language` field | New | `types.ts`, docs |
| Tag picker in admin edit / import | New | `InteractiveEditor.tsx`, `songs.ts` |
| Language filter chips on home library | New | `HomePage.tsx`, `songIndex.ts` |
| Include tags in index rebuild | Fix | `songIndex.ts`, `rebuild-index` script |
| Optional: tag badges on `SongRow` | New | `SongRow.tsx` |

**Acceptance:** Filter home library to one language; tags persist on save.

**Estimate:** Medium (2–4 days).

---

### Phase 5 — Lyric search (index extension)

**Goal:** Search finds songs by words in lyrics without per-keystroke Firestore reads.

| Task | Type | Files (likely) |
|------|------|----------------|
| Add `searchText` (or `lyricExcerpt`) to `songIndex` entries | New | `types.ts`, `songIndex.ts` |
| Populate on song create/update + rebuild script | New | `songs.ts`, `scripts/rebuild-index.ts` |
| Extend `filterSongIndex()` to search new field | Fix | `songIndex.ts` |
| Measure index size at 1k / 10k songs | Ops | manual / script |
| Update search placeholder copy | Fix | `HomePage.tsx` |

**Acceptance:** Searching a lyric phrase returns the correct song; home load time still acceptable.

**Estimate:** Medium (2–3 days + index rebuild).

---

### Phase 6 — Performance fullscreen & wake lock (new feature)

**Goal:** Distraction-free playing; screen stays on during set.

| Task | Type | Files (likely) |
|------|------|----------------|
| Fullscreen toggle on song view | New | `song/[id]/page.tsx`, new `PerformanceFullscreen.tsx` |
| Minimal overlay controls: exit, next, zoom | New | same |
| Integrate with playlist navigation | New | `song/[id]/page.tsx` |
| Wake Lock while fullscreen / autoscroll | New | `useWakeLock.ts` hook |
| iOS fallback documentation | Docs | this file / README |

**Acceptance:** Musician enters fullscreen, scrolls/zooms, advances playlist, screen does not dim (where supported).

**Estimate:** Medium (3–5 days, iOS testing).

**Phase 6 platform notes (implemented):**
- iOS Safari: pseudo-fullscreen (fixed `100dvh` + hidden app chrome) works; native Fullscreen API and Screen Wake Lock are often unavailable.
- Wake lock fallback: overlay may show “Screen may dim — adjust Auto-Lock in device settings” when `navigator.wakeLock` is unsupported.
- Recommended for long sets: Settings → Display → Auto-Lock → longest option (or Never), and install as PWA for standalone mode.

---

### Phase 7 — Minor key support (advanced)

**Goal:** Minor songs feel native in key picker and chord tools.

| Task | Type | Files (likely) |
|------|------|----------------|
| Parse/store minor keys (`Am`, `Em`) | New | `keyUtils.ts`, `types.ts` |
| Major/minor toggle or extended key grid | New | `KeySelectModal.tsx` |
| Minor diatonic palette | New | `engine.ts`, `ChordRow.tsx` |
| Fix Nashville numbers for minor tonic | Fix | `engine.ts` |
| Migration: existing songs unchanged | Ops | — |

**Acceptance:** Song in Am displays Am context; transpose ± respects minor root.

**Estimate:** Medium–large (4–6 days + tests).

---

## Recommended delivery order

```
Phase 1 → Phase 2 → Phase 3   (fast beta relief)
    ↓
Phase 4 → Phase 5             (library scale)
    ↓
Phase 6                       (performance mode)
    ↓
Phase 7                       (theory — when core UX stable)
```

---

## Original raw feedback (archive)

<details>
<summary>Click to expand original tester notes</summary>

1. Tags for each song — filter by language (Hindi, Malayalam, Tamil, English, Marathi, Telugu). At 10k songs scrolling won't work; need categories.

2. Instead of "Auto", use "Autoscroll" or scroll wording / play icon to save space.

3. Remove duplicate chord change ± near numbers; same functionality should be in bottom navbar only. Remove top chord change. Bottom shows "From C" — don't need that; current chord should stay large. Same for Auto — remove top Auto; play icon better. Theme icon slightly bigger.

4. Remove permanent zoom % from navbar; show only on pinch or ± as toast.

5. Search should match lyrics, not just title. Concern about database overload — is it feasible?

6. Reduce zoom below 85% if possible. Fullscreen mode for playing — pinch zoom, next in playlist, exit. Keep screen awake during fullscreen even with short device timeout.

7. Admin: "ChordPro source" and "Visual fine-tune" too technical — simpler wording.

8. Autoscroll: 0.7 on mobile barely moves; 0.8 slow but not slow enough; higher speeds too fast — need slower range.

Advanced: Minor scale songs — no option for minor transpose / minor chords display. Check if implemented; if not, how to show minor keys well.

</details>
