# Precise chord placement (web) — design + shipped behavior

**Status:** Implemented in `webmvp`. This document describes the **current** product and code (not a future sketch). For mobile parity, see [`mobile-chord-placement-parity-plan.md`](mobile-chord-placement-parity-plan.md). Touch/iPad placement uses **lyric scrub** — see [`web-lyric-scrub-placement-plan.md`](web-lyric-scrub-placement-plan.md).

**Canonical logic:** `webmvp/src/lib/chordPlacement.ts` (44 unit tests in `chordPlacement.test.ts`).

---

## Problem (historical)

Highlight-to-place worked on letters but failed for gaps, stacked chords in one space, end-of-line, and line-start. The old editor keyed chords by `start` only and required a non-empty selection for whitespace.

## Design: placement slots

```ts
type PlacementSlot =
  | { kind: "char"; start: number; end: number }
  | { kind: "gap"; index: number };
```

Gap commit (`resolveGapAnchor` + `applyPlacement`):

1. If the gap is a **whitespace run**, use the **first unoccupied space** in that run — no lyric change.
2. If every space in the run is occupied, **insert spacers at the end of the run** so the new chord lands to the right of existing gap chords. Count comes from `spacersToInsert()`:
   - **Inside an existing run:** `GAP_STACK_SPACES = 2` (see `prepareGapPlacement` test: `"Twinkle Twinkle"` → `"Twinkle   Twinkle"` after second chord in same gap).
   - **No whitespace run** (line start, end of line without trailing space, etc.): **1** spacer at the slot.
3. Deleting a chord on a spacer removes the spacer when `isRemovableSpacer` is true (doubled/leading/trailing spaces yes; single word separator `a b` no).

No schema migration: same `LyricLine` + `ChordMark` + ChordPro round-trip.

| User intent | Example stored lyrics | Evidence |
|-------------|----------------------|----------|
| Syllable highlight | `little star`, chord on `le` | `applyPlacement — char slots` |
| Two chords in one gap | `little   star` (3 spaces) | `applyPlacement — gaps between words` |
| Line start stack | `   How i wonder` | `applyPlacement — before the first word` |
| End of line | `star ` then `star   ` for two chords | `applyPlacement — end of line` |

---

## UX (as built)

| Principle | Implementation |
|-----------|----------------|
| Exact x-position | `useLyricChordOffsets` + `gapMeasurementIndices` in `LyricLineEditor.tsx` |
| Gap hit targets | Sibling overlay `.lyric-gap-layer` — **no text nodes** in overlay (`LyricLineEditor.tsx` ~306–357) |
| Gap width | Whitespace run width only; **not** widened into glyphs (`runWidth`, comment ~315–316) |
| Line start / end padding | `LINE_START_ZONE_PX = 14`, `LINE_END_ZONE_PX = 48` (`LyricLineEditor.tsx` ~35–36) |
| Ghost before commit | `ChordRow` `ghost` prop; label `pendingChord.trim() \|\| "+"` (~148–161) |
| Char-slot preview while typing | `ChordRow` `previewMark` from active char range (~141–146) |
| Gap insertion caret | `.lyric-gap-caret` at `gapCaretIndex` → `gapPreviewAnchor` for gaps (~42–49, 269–356) |
| Quick place | `PlacementToolbar` + `openSlot` → `stampChord` when `quickChord` set (`InteractiveEditor.tsx` ~382–384) |
| Undo | `MAX_HISTORY = 40`; `commitSections` pushes prior `Section[]` (~49, 187–199) |
| Preview spacers don’t save | `emit(..., { notifyParent: false })` + `pendingGapSpacer` ref; rewind via `rewindPreparedGapSpacer` (~159–168, 274–378) |
| Undo baseline with preview | `recordFrom` rewinds preview line before recording (`placeChord` / `stampChord` ~315–334, 443–458) |
| Slot move with preview | `moveSlot` restores `gap` slot from `pendingBefore.gapIndex` after rewind (~530–556) |
| Edit chord after preview | `slotAfterPreviewSpacerRewind` remaps mark indices (~105–119, 484–527) |
| Parent prop echo | `emittedSig` + `sectionsSignature` — parent echo doesn’t reset editor (~170–216) |
| No `+ space` button | Removed; implicit insertion only (see below) |
| Chord-only lines | `ChordRow` `packed={isChordOnlyLine(line)}` |

### Desktop vs touch (web)

| Surface | Chord entry | Lyric interaction |
|---------|-------------|-------------------|
| Desktop (`useTouchEditor` false) | `ChordInputPopover` — fixed bottom center, **non-modal** (clicks inside `.chord-chart-editor` retarget) | `mouseup` selection + `click` → `slotFromCaret` |
| Touch (`useTouchEditor` true: coarse pointer, hover none, max-width 1024px, or touch) | `InlineChordToolbar` fixed bottom | `selectionchange` (150ms debounce), `touchend` → caret slot; wide selection (≥60% line) → `collapseSelectionToWord` |

`useTouchEditor.ts` — single hook, used by both `InteractiveEditor` and `LyricLineEditor`.

### Keyboard (`InteractiveEditor.tsx` ~655–694)

| Key | Behavior |
|-----|----------|
| `⌘/Ctrl+Z` | Undo (not in input fields) |
| `Alt+←` / `Alt+→` | `moveSlot` when picker active |
| `Esc` | Disarm quick place if no active picker |
| `/` | `openFromDomSelection()` → `openSlot` |

Chord picker: `Enter` place, `Shift+Enter` place & next (`ChordInputPopover` / `InlineChordToolbar`).

### Composer entry points

- **Import / edit:** `AdminSongComposer` step 2 embeds `InteractiveEditor` with `layout="stacked"` (visual only in that step; source is step 1 `ChordProSourcePanel`).
- **Standalone tabs:** `InteractiveEditor` `layout="tabs"` — source ↔ visual with `persistSectionsWithoutGapPreview` when leaving visual.

Per line after lyrics: **"+ Chord line below"** → `insertChordLine` inserts `{ lyrics: "", chords: [] }`, rewinds gap preview, `recordFrom: baseSections`, shifts `active.lIndex` if needed (~565–598).

### Why there is no "Add space" button

`applyPlacement` / `prepareGapPlacement` already insert spacers when needed. A manual `+ space` duplicated that and left orphan spaces that ChordPro trim could break on source round-trip. See comment in prior plan — behavior unchanged.

### Gap zone width (precision)

Zones use `runWidth = max(right - left, 0)` from measured offsets. Widening into adjacent glyphs caused mis-clicks; line-start/end use padding zones in empty margin only (`LyricLineEditor.tsx` ~321–326).

---

## Module map (current)

### Pure domain

| File | Responsibility |
|------|----------------|
| `chordPlacement.ts` | Slots, zones, `prepareGapPlacement`, `rewindPreparedGapSpacer`, `gapPreviewAnchor`, `applyPlacement`, `removePlacementAt`, `nextSlot`/`prevSlot`, `describeSlot`, `findChordAtSlot`, `chordsUsedIn` (max 8) |
| `chordPlacement.test.ts` | 44 tests — caret, gaps, stack-2-spacers, preview rewind, ChordPro round-trip, remove, describe |

### UI

| File | Responsibility |
|------|----------------|
| `InteractiveEditor.tsx` | Sections state, history, quick place, `openSlot`, `pendingGapSpacer`, emit/notifyParent, keyboard, toolbar, chord UI branch |
| `LyricLineEditor.tsx` | Chord row + lyric + gap buttons + caret + selection handlers |
| `PlacementToolbar.tsx` | Undo, quick place toggle, stats string |
| `ChordInputPopover.tsx` | Desktop picker, palette + recents, target `aria-live` |
| `InlineChordToolbar.tsx` | Touch picker (same actions) |
| `ChordRow.tsx` | `ghost`, `previewMark`, `chordOffsets`, packed chord-only |
| `hooks/useLyricChordOffsets.ts` | Measure lyric indices for chord/gap positions |
| `hooks/useTouchEditor.ts` | Touch vs desktop detection |
| `hooks/useTextSelection.ts` | DOM offset ↔ lyric index |
| `globals.css` | `.chord-ghost`, `.lyric-gap-zone`, `.lyric-gap-caret`, reduced motion |
| `editorLabels.ts` | Step copy, hints |

### Deliberately not in scope (unchanged)

- Drag chord to new time position.
- `anchorKind` on `ChordMark`.
- Thin-space spacers.

---

## Acceptance criteria (verified by tests + manual)

- [x] Between words — reuse single space, no lyric change (`gap(6)` on `"little star"`).
- [x] Three+ chords in one gap — left-to-right order, `GAP_STACK_SPACES` when run full.
- [x] End of line without trailing space — append spacer(s).
- [x] Before first word — leading spacers, shift existing marks.
- [x] Remove gap chord removes removable spacer; single `a b` separator kept.
- [x] Char highlight + chord edit unchanged.
- [x] `prepareGapPlacement` preview rewound on cancel (`rewindPreparedGapSpacer` with `preparedSpacerCount`).
- [x] ChordPro serialize/parse round-trip for gap/end/start stacks.

Run: `npm run test -- --run src/lib/chordPlacement.test.ts`
