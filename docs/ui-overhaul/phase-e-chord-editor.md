# Phase E — Highlight-Based Chord Placement (Editor)

**Prerequisite:** Phase D (song view typography)  
**Problem:** Word-click fails when multiple chords sit on one word or between letters.  
**Solution:** Text selection range → place chord above selection start.

---

## Data model

```typescript
type ChordMark = {
  chord: string;
  start: number;
  end: number; // exclusive
};
```

**Backward compat:** Reader maps old `position` → `{ start: position, end: position + 1 }`.

---

## Tickets

### E-01 — Extend types + validation
**Files:** `types.ts`, `validation.ts`, `engine.ts` (if needed)  
**Do:** Support `start`/`end`; validator accepts either shape during migration.  
**Accept:** Tests for round-trip.

### E-02 — Read layer migration
**Files:** `ChordRow.tsx`, `toSong.ts`  
**Do:** Normalize marks on read.  
**Accept:** Existing songs render unchanged.

### E-03 — `useTextSelection` hook
**Files:** `webmvp/src/lib/hooks/useTextSelection.ts`  
**Do:** Track selection in lyric line contenteditable or mirror div; return `{start,end}`.  
**Accept:** Desktop mouse drag returns range.

### E-04 — Mobile selection UX
**Files:** `LyricLineEditor.tsx`  
**Do:** Long-press initiates selection; native handles on iOS/Android where possible.  
**Accept:** Can select substring on 390px width.

### E-05 — Selection highlight style
**Files:** `globals.css`  
**Do:** `--lf-brand-soft` bg on selected range; visible in light + dark.  
**Accept:** Selection obvious at arm's length.

### E-06 — Chord input popover
**Files:** `ChordInputPopover.tsx`  
**Do:** After selection, show input + "Place chord" + common diatonic chips.  
**Accept:** Enter places chord at selection start.

### E-07 — Render chords from ranges
**Files:** `ChordRow.tsx`  
**Do:** Position using `start` char index (`ch` units); multiple chords same line supported.  
**Accept:** Two chords on one word align correctly.

### E-08 — Edit page layout (`edit song.png`)
**Files:** `app/song/[id]/edit/page.tsx`, `InteractiveEditor.tsx` refactor  
**Do:** Title, artist, key grid, lyric editor area per mockup; admin only.  
**Accept:** Matches mockup shell.

### E-09 — Remove word-only click path
**Files:** `InteractiveEditor.tsx`  
**Do:** Replace `onWordClick` with selection flow; keep keyboard shortcut `/` to focus chord input.  
**Accept:** No regression on save/publish draft flow.

### E-10 — Editor mobile layout
**Files:** edit page CSS  
**Do:** Full-width editor; popover docks above keyboard.  
**Accept:** Usable on tablet portrait.

### E-11 — Firestore write shape
**Files:** `songEdits.ts`, publish flow  
**Do:** Save `start`/`end` on new edits; strip legacy `position` on publish.  
**Accept:** Published songs use new shape.

---

## Phase E acceptance

- [ ] Can place 2+ chords on one word
- [ ] Can place chord on single letter
- [ ] Mobile + desktop selection works
- [ ] Admin edit page matches mockup
- [ ] Song view renders new marks correctly
