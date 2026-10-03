# Mobile chord placement — web parity plan (code-aligned)

**Goal:** Flutter admin step **2 · Placement** must match **`InteractiveEditor`** + **`LyricLineEditor`** as shipped in `webmvp`, not per-line ChordPro text fields.

**Status:** Phases **1–7 delivered** in `mobile/` (domain, controller, `LyricLinePlacementEditor`, `ChordPlacementSheet`, tests).

**Spec synced to code:** 2025-10-03 — cross-checked against `chordPlacement.ts`, `InteractiveEditor.tsx`, `LyricLineEditor.tsx`, `chordPlacement.test.ts` (44 tests).

**Web design doc (behavior):** [`web-chord-placement-plan.md`](web-chord-placement-plan.md) — updated to reflect implementation, not the original sketch.

---

## Source of truth (web files → port)

| Concern | Web path | What to mirror |
|---------|----------|----------------|
| Pure logic | `webmvp/src/lib/chordPlacement.ts` | All exports in appendix; constants `GAP_STACK_SPACES = 2`, `MAX_QUICK_PICKS = 8` |
| Tests | `webmvp/src/lib/chordPlacement.test.ts` | **44** scenarios — Dart port is the oracle |
| Editor shell | `webmvp/src/components/InteractiveEditor.tsx` | `emit`/`notifyParent`, `pendingGapSpacer`, `openSlot`, `stampChord`, `recordFrom`, `emittedSig`, undo, `insertChordLine`, `persistSectionsWithoutGapPreview`, `slotAfterPreviewSpacerRewind` |
| Per-line UI | `webmvp/src/components/LyricLineEditor.tsx` | Gap overlay, `LINE_START_ZONE_PX=14`, `LINE_END_ZONE_PX=48`, ghost/caret, selection vs caret |
| Offsets | `webmvp/src/lib/hooks/useLyricChordOffsets.ts` | Pixel positions for chords + gap zones |
| Toolbar | `webmvp/src/components/PlacementToolbar.tsx` | Undo, quick place, `{chordCount} chords · {chordedLines}/{lineCount} lines chorded` |
| Desktop chords | `webmvp/src/components/ChordInputPopover.tsx` | Target label, palette+recents, place / place & next / remove |
| Touch chords | `webmvp/src/components/InlineChordToolbar.tsx` | Same API as popover; web admin on phone uses this |
| Touch detect | `webmvp/src/lib/hooks/useTouchEditor.ts` | On mobile Flutter, **always** touch-first (bottom sheet), equivalent to `InlineChordToolbar` |
| Row render | `webmvp/src/components/ChordRow.tsx` | `ghost`, `previewMark`, `packed` / `isChordOnlyLine` |
| Composer step 2 | `webmvp/src/components/AdminSongComposer.tsx` | `InteractiveEditor` `layout="stacked"` — **not** a separate placement widget |

---

## Mobile today (evidence)

| Piece | Path | vs web |
|-------|------|--------|
| Steps 1→2, flush source | `mobile/.../admin_song_composer.dart` | Aligns with web (`Continue to placement`, `tryFlushChordSource` on tab switch) |
| Step 2 UI | `placement_editor.dart` → `InteractivePlacementEditor` | Slot editor, toolbar, undo, quick place, gap spacers, `+ Chord line`, bottom `ChordPlacementSheet` |
| Domain | `chord_placement.dart`, `placement_text_selection.dart` | Port of `chordPlacement.ts` + selection helpers; **44** domain tests |
| Per-line UI | `lyric_line_placement_editor.dart` | Gap zones, ghost/caret, `previewMark`, selection debounce |
| Layout | `chord_row.dart` (ghost/preview), `chord_label_measure.dart` | Editor offsets; chart layout unchanged |

---

## Behavior checklist (web code → mobile must match)

Each row cites where web implements it.

| # | Behavior | Web evidence |
|---|----------|--------------|
| 1 | Gap click → `prepareGapPlacement`; may insert **2** spacers when run full | `chordPlacement.ts` `spacersToInsert`, `prepareGapPlacement`; test lines 134–141 |
| 2 | Preview spacers in UI only until place/cancel | `InteractiveEditor` `pendingGapSpacer`, `emit(..., notifyParent: false)` ~369–378 |
| 3 | Cancel / switch slot / source tab rewinds preview | `rewindPendingGapSpacerInto`, `clearPlacement`, `persistSectionsWithoutGapPreview` |
| 4 | Commit with preview uses `recordFrom` so undo doesn’t leave phantom spacers | `placeChord` ~443–458, `stampChord` ~315–334 |
| 5 | Re-click same gap while placing → next anchor (via fresh `prepareGapPlacement`) | `openSlot` ~364–378; domain resolves next free index or inserts stack |
| 6 | Quick place arms `lastChord`; gap/char tap calls `stampChord` | `openSlot` ~382–384, `PlacementToolbar` |
| 7 | Ghost at gap: `gapPreviewAnchor` / caret; label `+` or typed chord | `LyricLineEditor` ghost ~148–161 |
| 8 | Char slot: highlight lyric + `previewMark` on chord row | `LyricLineEditor` ~141–146, `ChordRow` |
| 9 | Gap zones: whitespace width only; start/end padding constants | `LyricLineEditor` ~307–326 |
| 10 | `describeSlot` in chord UI | `InteractiveEditor` `targetLabel` ~241–246 |
| 11 | `+ Chord line below` per line | `InteractiveEditor` ~836–842, `insertChordLine` |
| 12 | Chord-only empty lyric line | `isChordOnlyLine` + `packed` chord row |
| 13 | Undo depth 40 | `MAX_HISTORY` ~49 |
| 14 | Parent sections echo must not reset editor | `emittedSig` ~170–216 |
| 15 | `findChordAtSlot` only on char slots (gaps open empty or stack) | `chordPlacement.test.ts` ~417–426 |
| 16 | Validation `isValidChord` on place | `InteractiveEditor` `placeChord` ~433–435 |
| 17 | Recents = `chordsUsedIn` (8 max) + diatonic palette | `InteractiveEditor` ~235–236, 696 |

**Not placement (already on mobile elsewhere):** slash/bass/alternate chord parsing — `engine.dart`; keep validation aligned with web `isValidChord`.

**Explicitly absent on web (do not add on mobile):** `+ space` button.

---

## Architecture target (Flutter)

```
mobile/lib/domain/chord_placement.dart          ← port chordPlacement.ts
mobile/test/domain/chord_placement_test.dart    ← port 44 tests

mobile/lib/features/admin/widgets/
  interactive_placement_editor.dart             ← InteractiveEditor state machine
  lyric_line_placement_editor.dart              ← LyricLineEditor + offset measurement
  placement_toolbar.dart                        ← PlacementToolbar
  chord_placement_sheet.dart                    ← InlineChordToolbar equivalent (primary on mobile)

placement_editor.dart                           → thin wrapper or remove
```

**Offset measurement:** Port or reimplement `useLyricChordOffsets` using the same lyric font/metrics as `ChordLineWidget` (critical for gap zone alignment).

**Data model:** Unchanged `LyricLine` / `ChordMark` / grapheme indices.

**Delete when visual editor ships:**

- `_LineEditorField` and ChordPro-in-placement path in `placement_editor.dart`
- `placement_editor_test.dart` theme smoke test → replace with domain + targeted widget tests

**Keep:**

- Composer step 1 ChordPro bulk edit + `getSectionsForSave()` / `tryFlushChordSource`

---

## Phases

### Phase 0 — Baseline ✅

### Phase 1 — Domain port ✅

Port `chord_placement.dart` + **44** tests. Include:

- `PreparedGapPlacement.preparedSpacerAt` / `preparedSpacerCount`
- `rewindPreparedGapSpacer(line, index, count)` with `count === 2` case
- `gapPreviewAnchor` vs `prepareGapPlacement` alignment

**Exit:** `flutter test test/domain/chord_placement_test.dart` green.

### Phase 2 — Editor shell ✅

`interactive_placement_editor.dart`:

- `emit(sections, notifyParent: true|false)`
- `pendingGapSpacer` state (sIndex, lIndex, index, count, gapIndex)
- `commitSections` + history (40)
- `emittedSig` / `sectionsSignature` if parent passes sections back
- `PlacementToolbar` wired

**Exit:** Undo + quick place on mock lines without full lyric UI.

### Phase 3 — Lyric line editor ✅

- Gap zones from `gapZonesForLine` + measured offsets
- `LINE_START_ZONE_PX` 14, `LINE_END_ZONE_PX` 48
- `openSlot` pipeline: rewind → `prepareGapPlacement` → optional preview emit
- Ghost + caret + char highlight
- `ChordRow`/`ChordLineWidget`: `ghost`, `previewMark`, packed chord-only lines

**Exit:** Place on gap/char without ChordPro typing.

### Phase 4 — Chord sheet ✅

Bottom sheet: `describeSlot`, palette, recents, place, place & next (`nextSlot`), remove, invalid chord error string matching web.

Touch lyric behavior: caret tap + long-press selection → `slotFromCaret` / `slotFromSelection`; optional word-collapse for huge selections (web 60% rule).

### Phase 5 — Line list chrome ✅

`+ Chord line below`, section headers, scroll; `insertChordLine` with active index shift; remove old placement fields.

### Phase 6 — Polish ✅

`ChartThemeScope`, min touch targets without widening gap runs into glyphs, safe area on bottom sheet.

### Phase 7 — QA ✅

Mobile placement → serialize → web source tab; update `flutter-phase-10-admin.md` §2.5.

---

## Acceptance (maps to web tests)

1. Char on syllable — lyrics unchanged (`applyPlacement — char slots`).
2. Two chords same gap — e.g. `"little   star"` for two chords at index 6 gap (`gaps between words`).
3. Line start — `"   How i wonder"` two chords (`before the first word`).
4. End of line — `"star "` / `"star   "` (`end of line`).
5. Preview rewind — `rewindPreparedGapSpacer` with `preparedSpacerCount: 2` (`prepareGapPlacement` test).
6. Quick place — three taps, three marks (manual; shell test in Phase 2).
7. `+ Chord line` — empty `lyrics`, chords layout packed.
8. `notifyParent: false` during preview — parent `sections` unchanged until commit (widget/integration).
9. ChordPro round-trip — tests in `ChordPro round-trip` describe block.

---

## Appendix — `chordPlacement.ts` exports to port

| Export | Notes |
|--------|--------|
| `PlacementSlot`, `GapZone` | |
| `slotPosition`, `slotFromCaret`, `slotFromSelection` | |
| `slotsForLine`, `gapZonesForLine`, `gapMeasurementIndices` | |
| `gapPreviewAnchor` | |
| `PreparedGapPlacement` | includes `preparedSpacerCount` |
| `prepareGapPlacement`, `rewindPreparedGapSpacer` | `count` default 1, use **count from prepare** |
| `AppliedPlacement`, `applyPlacement` | |
| `isRemovableSpacer`, `removePlacementAt` | |
| `findChordAtSlot` | gaps → undefined |
| `nextSlot`, `prevSlot`, `describeSlot` | |
| `chordsUsedIn` | top 8 by frequency |

## Appendix — `InteractiveEditor` state to port (not in chordPlacement.ts)

| Mechanism | Purpose |
|-----------|---------|
| `pendingGapSpacer` ref fields | `sIndex`, `lIndex`, `index`, `count`, `gapIndex` |
| `slotAfterPreviewSpacerRewind(mark, index, count)` | Edit chord / move slot after preview |
| `persistSectionsWithoutGapPreview` | Save / leave visual tab |
| `insertLineAfter` + `replaceLine` | Line insert / patch helpers |
| `openFromDomSelection` | `/` shortcut — optional on mobile |
| `beginChordEdit` | Tap existing chord |
| `moveSlot` | Alt arrows — optional on mobile |

---

## Implementation order

1. Phase 1 (domain + 44 tests).
2. Phases 2–5 (replace `placement_editor.dart`).
3. Phases 6–7.

Each phase should keep `AdminSongComposer` buildable.
