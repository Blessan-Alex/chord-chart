# Precise chord placement (web) — UX + implementation plan

Scope: `webmvp` only. The Flutter app is out of scope for this round.

## The problem users report

Highlight-to-place works well **on letters**, but breaks down everywhere else:

| User intent | Today |
|---|---|
| Chord in the space between two words | Must drag-select a single space character — nearly impossible to hit, and invisible once selected |
| Several chords in one gap (`star   [c][c]`) | Second chord overwrites the first (editor keys chords by `start` only) |
| Chord at the end of a line with no trailing space | Lands *on* the last letter, and a second one is impossible |
| Chords before the first word (`[c][c]How`) | No way to express it visually |

Root cause: the visual editor's only placement primitive is a **non-empty text selection**. `getSelectionRangeInElement` returns `null` for a collapsed caret, and `commitChord` treats `start` as a unique key. Meanwhile the ChordPro parser already solves the same problem by **inserting a spacer character** for back-to-back `[A][B]` marks — the visual editor just never reuses that rule.

## Design decision: slots, not selections

Introduce one concept that covers every case: a **placement slot**.

```ts
type PlacementSlot =
  | { kind: "char"; start: number; end: number }   // on a grapheme (today's behavior)
  | { kind: "gap"; index: number }                 // between graphemes, incl. line start/end
```

Committing to a gap resolves against the lyric string:

1. If the gap is a whitespace run, use the **first unoccupied space** in that run — no lyric mutation, no visual shift.
2. If every space in the run is taken, **insert one space at the end of the run** so the new chord lands to the *right* of the chords already in that gap (musical order is preserved).
3. If there's no whitespace at all (line start, end of line, mid-word), **insert a space at the slot** and shift the affected marks.

Deleting a chord whose anchor is a space **removes the spacer again**, but only when removing it wouldn't glue two words together (`isRemovableSpacer`). Lines don't accumulate junk whitespace.

Why this approach: `ChordMark {chord, start, end}` and the lyric string stay exactly as they are, so Firestore documents, `validation.ts`, the performance renderer, `wrapLyricLine`, and ChordPro round-tripping all keep working with **zero migration**. Every state the new UI can produce is a state the source tab can already express:

| User's example | Stored lyrics | ChordPro round-trip |
|---|---|---|
| `litt[c]le star` | `little star` | char slot, unchanged behavior |
| `star   [c][c]` | `star   ` (spacers) | `star  [c] [c]` → reparses identically |
| `[[c]c]How` | `  How` | `[c] [c] How` → reparses identically |

No `anchorKind` field, no schema version bump, no backend work. **Backend changes needed: none.**

## UX principles applied

1. **Direct manipulation** — you click precisely where the chord goes, and that exact x-position is where it renders. Gap hit zones are measured from the real glyph geometry (`measureLyricCharOffset`), not estimated.
2. **Fitts's law** — a single space is ~9px wide, which is not a target. Every gap gets a full-row-height hit zone; the end-of-line zone extends into the empty space to the right of the text; the line-start zone lives in the left padding.
3. **Feedforward over feedback** — a dashed **ghost chord** appears above the line at the exact landing position before you commit, so you never place-then-check-then-undo.
4. **Recognition over recall** — gaps reveal an insertion caret on hover instead of requiring you to know that `/` exists or that ChordPro uses brackets.
5. **Flow** — the desktop picker no longer throws a modal scrim over the chart. You can click the next target while it's open, and **Place & next** (`⇧⏎`) walks slot-by-slot down the line so a whole verse can be chorded without touching the mouse.
6. **Momentum for repetition** — worship charts repeat the same 4 chords. **Quick place** arms the last chord so each additional placement is a single click.
7. **Reversibility** — because placement can now mutate lyrics, every mutation is undoable (`⌘Z`/`Ctrl+Z`, plus a visible Undo button).
8. **Clarity of target** — the picker states the target in words (`Gap · between "little" and "star"`, `End of line · after "star"`) in an `aria-live` region, so the target is unambiguous even when the highlight is a single space.
9. **Accessibility** — gap zones are real `<button>`s with descriptive `aria-label`s; all interactions have keyboard equivalents; motion respects `prefers-reduced-motion`.
10. **No regressions to what already works** — highlighting letters behaves exactly as before, including the mobile word-snap heuristic.

## Interaction model

### Desktop
| Action | Result |
|---|---|
| Drag-select letters | Char slot (unchanged) |
| Click a letter | Char slot on that grapheme |
| Click a space / hover gap zone | Gap slot, insertion caret shown |
| Click end-of-line zone | Gap at end of line |
| Click line-start zone | Gap before the first word |
| Click an existing chord | Edit it (unchanged) |
| `/` | Open picker at the current selection *or caret* |
| `⏎` / `⇧⏎` | Place / Place and advance to next slot |
| `Alt ←` / `Alt →` | Move the slot one position without losing the typed chord |
| `Esc` | Close picker, or disarm Quick place |
| `⌘Z` | Undo last placement |

### Touch (web)
Tap resolves to a slot with the same rules (tap in whitespace → gap). The bottom toolbar gains the same **Place & next** and target description. Zones get an expanded vertical hit area.

### Why there is no "Add space" button
The original sketch had an explicit `+ space` control. It was built, then removed: because `applyPlacement` already reuses the first free space in a run and only inserts a spacer when it needs one, pressing `+ space` and then placing a chord produced byte-identical output to placing the chord directly. Its only observable effect was when the user abandoned the picker afterwards, which left an orphan trailing space — and since `parseChordProSections` trims each line, a round-trip through the source tab then shifted the chord one position left. The button added a redundant step and one real failure mode, so implicit insertion is the only path.

### Gap zone width
Gap zones span exactly the whitespace they represent and are never widened past it. Widening a ~9.6px space to a comfier 12–14px target overlapped the neighbouring glyph, so a click aimed at a letter's leading edge opened the gap instead — the opposite of the precision users asked for. The full line height already makes the zone easy to hit, and a miss in either direction still lands on a sensible slot. Line-start and line-end zones keep generous padding because they sit in empty space with no glyphs to steal.

## Implementation

### New
- `src/lib/chordPlacement.ts` — pure slot logic: `slotFromCaret`, `slotsForLine`, `gapZonesForLine`, `applyPlacement`, `removePlacementAt`, `nextSlot`/`prevSlot`, `describeSlot`, `findChordAtSlot`.
- `src/lib/chordPlacement.test.ts` — covers all four user scenarios plus ChordPro round-trip through `serializeChordProLine`.
- `src/components/PlacementToolbar.tsx` — Undo + Quick place + stats.

### Modified
| File | Change |
|---|---|
| `LyricLineEditor.tsx` | Gap zone overlay (sibling layer, zero text nodes so measurement stays exact), insertion caret, click-to-place, slot-aware props |
| `InteractiveEditor.tsx` | Slot state, spacer-aware commit/remove, undo history, Quick place, keyboard map, source-tab re-sync |
| `ChordRow.tsx` | Additive `ghost` prop for the dashed preview |
| `ChordInputPopover.tsx` | Non-blocking on desktop, slot description, Place & next, shortcut hints |
| `InlineChordToolbar.tsx` | Place & next, slot description |
| `globals.css` | Gap zone, insertion caret, ghost chord, reduced-motion |
| `editorLabels.ts` | Copy for the new model |

### Deliberately deferred
- Drag an existing chord sideways to retime it.
- Starting a text drag-selection *on* a space. Gap zones are buttons, so pressing one and dragging away cancels, exactly like any button. Dragging *across* a gap into another word still works normally, and the gap target itself replaces the reason to select whitespace.
- Thin space (`U+2009`) spacers instead of normal spaces, if wide gaps bother anyone in performance view.
- `anchorKind` on `ChordMark` — only if the spacer model ever proves insufficient.

## Acceptance criteria

- Click between two words → chord renders between those words; source tab shows the equivalent ChordPro and reparses to the same sections.
- Three chords can be placed in one gap, left to right, in the order clicked.
- Two chords can be placed after the final word of a line that has no trailing space.
- Chords can be placed before the first word.
- Removing a gap chord removes its spacer; removing a chord sitting on a real word separator does not.
- Highlight-on-letter and click-chord-to-edit behave exactly as before.
- `npm run test`, `npm run lint`, `npm run typecheck` pass.
