# Web lyric scrub placement — plan (evidence-based)

**Status:** Shipped in `webmvp` (scrub when `usePreferLyricScrub` = touch editor **and** `(pointer: coarse)`; fine-pointer laptops keep click/drag-select + gap buttons).  
**Scope:** `webmvp` only.  
**Canonical placement logic:** `webmvp/src/lib/chordPlacement.ts` (unchanged contract).  
**Prior doc:** [`web-chord-placement-plan.md`](web-chord-placement-plan.md).

---

## 1. Problem statement (user-reported + code evidence)

| Symptom | Evidence |
|---------|----------|
| Gaps work; **letters often don’t** | `LyricLineEditor.tsx` touch path relies on `selectionchange` + `getSelectionRangeInElement` (L175–207); collapsed caret uses `touchend` + `getFocusOffsetInElement` (L217–228). Native selection is poor for single graphemes on touch. |
| Gap targets steal taps | `.lyric-gap-zone` uses `pointer-events-auto` over the lyric row (`LyricLineEditor.tsx` L307–347); line-start zone extends left by `LINE_START_ZONE_PX` (L321–323), overlapping first glyph hit area. |
| Quick place is desired | `InteractiveEditor.openSlot` L382–384: when `quickChord` is set, `stampChord` runs immediately — UX depends on **accurate slot** from the line UI. |
| No placement **between** lyric rows | Each line is a separate `LyricLineEditor`; inter-line area is `+ Chord line below` (`InteractiveEditor.tsx` L836–842). Scrub handlers attach only to the lyric scrub surface, not section margins. |
| Indic scripts | `graphemeRangeAt` / `slotFromCaret` default `locale = "en"` (`graphemeUtils.ts`); song tags include `lang:malayalam`, `lang:tamil`, `lang:telugu`, `lang:hindi` (`languageTags.ts`). |
| iPad / touch | `useTouchEditor()` true for `(max-width: 1024px), (pointer: coarse), (hover: none)` or touch capability (`useTouchEditor.ts`). |

---

## 2. Design decision: scrub caret (touch) + keep desktop selection

**Touch / iPad (primary):** iOS trackpad-mode *analog* — press on lyric line, drag horizontally, caret snaps to **string indices** `0…length` (every boundary, including spaces), release → `slotFromCaret(lyrics, index, locale)` → existing `onPlaceSlot` / quick place.

**Desktop (pointer: fine):** Keep `mouseup` highlight + `click` caret (`LyricLineEditor.tsx` L251–266). Gap zone buttons remain clickable.

**Not in scope:** System keyboard spacebar trackpad; native `UITextInteraction` floating cursor.

---

## 3. Slot resolution (unchanged rules)

All commits still go through `chordPlacement.ts`:

- `slotFromCaret` — space at index → `{ kind: "gap", index }`; else grapheme `char` range via `graphemeRangeAt(..., locale)`.
- Gap stacking / preview spacers — `prepareGapPlacement`, `InteractiveEditor.pendingGapSpacer`.
- Quick place — `openSlot` → `stampChord` when `quickChord` armed.

---

## 4. Hit testing (implementation)

**File:** `webmvp/src/lib/lyricCaretHitTest.ts`

- For each index `i` in `0…lyrics.length`, X position from `measureLyricCharOffset(element, i)` (`lyricMeasurement.ts` — DOM ranges, works with `<mark>` highlight and complex scripts).
- `caretIndexFromPointer(element, clientX, lyricsLength)` picks the index with minimum `|x - offset[i]|`.
- **Edge cases:**
  - Empty line → index `0` only.
  - Click left of first glyph → index `0` (line-start gap).
  - Click right of last glyph → index `length` (line-end gap).
  - Mid whitespace → index at run start (caret boundary); `slotFromCaret` maps to gap.
  - RTL: out of scope (LTR lyrics only).

---

## 5. UX specification

| Element | Behavior |
|---------|----------|
| Scrub surface | `min-height: 48px`, `touch-action: none`, `user-select: none` during touch scrub (`globals.css` `.lyric-scrub-surface`). |
| Caret while dragging | `.lyric-scrub-caret` at measured X (solid, no blink). |
| Preview bubble | `.lyric-scrub-preview` shows pending chord or `+` above caret during scrub. |
| Haptic | `navigator.vibrate(8)` on scrub start (optional, ignored if unsupported). |
| Gap zones on touch | `pointer-events: none` when `touchEditor` — avoids overlap with letters. |
| Reduced motion | No blink animation on scrub caret (`prefers-reduced-motion`). |
| Scroll vs scrub | Scrub surface does not wrap chart scroll container; horizontal lyric `overflow-x: auto` preserved on inner row. |
| Between lines | No pointer handlers on `.chord-line` wrapper or `+ Chord line` except button itself. |

**Copy:** `EDITOR_VISUAL_HINT_TOUCH` updated to describe drag-to-position + quick place.

---

## 6. Locale & fonts

| Tag | `Intl` locale | Font variable |
|-----|---------------|---------------|
| `lang:english` | `en` | default stack |
| `lang:malayalam` | `ml` | `--font-noto-malayalam` |
| `lang:hindi` | `hi` | `--font-noto-devanagari` |
| `lang:marathi` | `mr` | `--font-noto-devanagari` |
| `lang:tamil` | `ta` | `--font-noto-tamil` |
| `lang:telugu` | `te` | `--font-noto-telugu` |

**File:** `localeFromLanguageTag.ts` — used by `LyricLineEditor` and optional `data-lyric-locale` on chart editor for CSS.

`slotFromCaret` / `slotFromSelection` accept optional `locale` (default `en`).

---

## 7. iPad / responsive

| Area | Action |
|------|--------|
| Touch editor breakpoint | Already ≤1024px (`useTouchEditor`). |
| Bottom toolbar | `InlineChordToolbar` uses `env(safe-area-inset-bottom)` (existing). |
| Chart padding | `InteractiveEditor` `pb-24 sm:pb-0` for toolbar clearance. |
| Landscape | Existing `song-page--landscape` rules in `globals.css`; editor chart uses `p-4` + full width inside composer card. |
| Wide iPad landscape | Composer card `sm:p-6`; no second column in v1 (future: side picker). |

---

## 8. Files touched

| File | Role |
|------|------|
| `lyricCaretHitTest.ts` | Pointer X → caret index |
| `lyricCaretHitTest.test.ts` | Unit tests (mocked measurement) |
| `localeFromLanguageTag.ts` | Tag → locale + CSS hint |
| `hooks/useLyricCaretScrub.ts` | Pointer capture lifecycle |
| `LyricLineEditor.tsx` | Scrub vs desktop split; touch gap zones off |
| `chordPlacement.ts` | Optional `locale` on caret/selection slots |
| `InteractiveEditor.tsx` | Pass `languageTags` |
| `AdminSongComposer.tsx` | Pass `tags` to editor |
| `editorLabels.ts` | Touch hint copy |
| `globals.css` | Scrub surface, preview, Tamil/Telugu stack |
| `layout.tsx` | Noto Tamil + Telugu fonts |

---

## 9. Test matrix

| Case | Expected |
|------|----------|
| Tap release without move (touch) | Place at nearest boundary |
| Drag across word | Caret snaps per boundary; release → char slot on grapheme under caret |
| Drag across space | Gap slot |
| Quick place + scrub release | Chord stamped without picker |
| Desktop click letter | `placeAtCaret` → char slot |
| Desktop drag syllable | `mouseup` → char slot |
| Desktop gap button | Still works |
| Malayalam multi-codepoint grapheme | `locale=ml` → single char slot |
| Empty lyric line | Scrub surface tap → gap index 0 |
| `prefers-reduced-motion` | No blink on scrub caret |

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| O(n) measure per `pointermove` | Typical line length &lt; 120; n ≤ 121; acceptable; cache offsets per move frame if needed later |
| Font load shifts layout | `useLyricChordOffsets` already remeasures on `document.fonts.ready` |
| Scrub blocks vertical scroll | Handler only on lyric strip; chart scroll on outer viewport |
| Regression desktop | Touch and desktop paths gated on `useTouchEditor()` |

---

## 11. Future (not v1)

- Magnifier lens above finger
- Long-press-only scrub to reduce accidental activation
- Landscape split view (chart + picker)
- RTL lyrics
