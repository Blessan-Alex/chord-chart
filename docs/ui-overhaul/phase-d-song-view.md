# Phase D — Song View UI + Key Modal + Autoscroll

**Prerequisite:** Phase A, C  
**Outcome:** Song page matches `lyrics.png`; autoscroll speed bar from `autoscroll.jpeg`; **keep** performance mode, wrap, zoom, playlist nav.

---

## Tickets

### D-01 — Song header
**Files:** `SongToolbar.tsx` → split `SongHeader.tsx`  
**Do:** Back, title, artist subtitle, heart icon (optional inactive).  
**Accept:** Matches `lyrics.png` header.

### D-02 — Control toolbar row
**Files:** `SongControlBar.tsx`  
**Do:** Transpose cluster | Chords/Numbers segment | A− A A+ sizes.  
**Accept:** Matches mockup; wires to existing state handlers.

### D-03 — Original key chip
**Files:** `SongControlBar.tsx`  
**Do:** "Original key" label + G badge below toolbar.  
**Accept:** Shows `song.originalKey`.

### D-04 — Key select modal
**Files:** `KeySelectModal.tsx`  
**Do:** 4×3 grid per `oirginalkeykyrics.png`; Original subtitle.  
**Accept:** Selecting key calls `setTargetKey`; closes modal.

### D-05 — Wire modal to Key button
**Files:** `song/[id]/page.tsx`  
**Do:** Tap center Key opens modal on mobile + desktop.  
**Accept:** No native `<select>` on song view.

### D-06 — Lyric typography
**Files:** `globals.css`, `ChordLine.tsx`  
**Do:** Lyrics `font-family: var(--font-lora)`; chords `--lf-brand` sans/mono.  
**Accept:** Visual match to mockup.

### D-07 — Section labels
**Files:** `globals.css`  
**Do:** VERSE style: small caps gray + horizontal rule extension.  
**Accept:** Matches `[Verse 1]` treatment in mockup.

### D-08 — Merge performance bottom bar (mobile)
**Files:** `PerformanceBottomBar.tsx`  
**Do:** Restyle to lf tokens; keep prev/next when `?playlist=`; hide duplicate controls now in toolbar on desktop.  
**Accept:** Mobile: one bottom bar; desktop: toolbar only OR slim bar.

### D-09 — Desktop vs mobile control split
**Files:** `song/[id]/page.tsx`  
**Do:** ≥768px: controls in header; <768px: compact header + bottom bar for transpose/nav.  
**Accept:** No duplicate ± buttons on same viewport.

### D-10 — Playlist query param rename
**Files:** `sessionNavigation.ts`, pages  
**Do:** Accept `?playlist=id&index=n`; redirect old `?session=`.  
**Accept:** Old links still work.

### D-11 — Autoscroll hook
**Files:** `webmvp/src/lib/hooks/useAutoscroll.ts`  
**Do:** `requestAnimationFrame` scroll on chart container; speed 0.5–2.0; pause/resume.  
**Accept:** Chart scrolls smoothly at 1.0x.

### D-12 — Autoscroll bar UI
**Files:** `AutoscrollBar.tsx`  
**Do:** − | 1.0x | + | pause | close per autoscroll spec; LF colors not UG green.  
**Accept:** Matches **layout** of autoscroll.jpeg; uses brand blue.

### D-13 — Autoscroll entry button
**Files:** `SongControlBar.tsx`  
**Do:** "Auto" or scroll icon toggles bar (not in mockup — minimal pill button).  
**Accept:** Does not remove existing features.

---

## Phase D acceptance

- [ ] Song view matches mockups light mode
- [ ] Key modal works
- [ ] Autoscroll speed adjustable while playing
- [ ] Wrap, zoom, transpose, numbers, playlist nav still work
- [ ] Long lines show full text (no clip)
