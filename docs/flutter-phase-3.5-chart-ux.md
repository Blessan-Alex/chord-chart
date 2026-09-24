# Flutter Phase 3.5 — Chart UX, pinch zoom & layout performance

**Parent:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 3.5 (chart polish)  
**Parity specs:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.4 song chart, web `useChartZoom`, `ChordChartViewport`, `useLyricChordOffsets`  
**Depends on:** [Phase 3](flutter-phase-3-song-chart.md) chart screen shipped  
**Backend:** None (client-only)

**Goal:** Make the **lyrics + chord-over-lyric** experience **fluid on all devices**: chords stay aligned to lyric grapheme indices; pinch zoom feels seamless; no jank on long songs during performance.

**Estimate:** 0.5–1 person-week (1 FTE) — can ship alongside Phase 8 QA or as a fast-follow patch.

**Status:** **Implemented in `mobile/`** — transform-based live pinch, commit reflow, offset cache, `RepaintBoundary`, lazy section list.

---

## 1. Problem statement

Phase 3 correctly implements **semantic zoom** (scale changes `fontSize` and `maxChars`, remeasures chord offsets via `TextPainter`). The first mobile implementation also called **`setState` on the entire `SongScreen` on every pinch frame**, remeasuring every line synchronously — causing stutter and gesture fights with `SingleChildScrollView`.

Web separates **live pinch** (`setScaleLive`) from **persist** (`commitScale`) and uses a **pinch activation threshold** before zoom applies.

---

## 2. Scope summary

### In scope (Phase 3.5)

| Area | Web reference | Flutter deliverable |
|------|---------------|---------------------|
| Live pinch | `setScaleLive` + CSS `--chart-scale` | **`Transform.scale`** on chart subtree during pinch; layout scale unchanged until commit |
| Pinch commit | `commitScale`, `snapChartScale` | **`onPinchCommit`** → single parent `_setScale` + persist prefs |
| Pinch activation | `PINCH_ACTIVATION_PX` | `chartPinchActivationScaleDelta` (~5% scale delta before arming) |
| Two-finger only | touch count === 2 | Ignore `onScaleUpdate` when `pointerCount < 2` |
| Zoom indicator | 1500ms flash | Indicator during pinch **local to viewport**; button zoom still uses `_flashZoomIndicator` on parent |
| Chord measurement cache | DOM remeasure on resize | LRU-style cache in `measureChordOffsets` keyed by lyrics/indices/style/width |
| Repaint isolation | — | `RepaintBoundary` per section and per line |
| Long songs | — | `ListView.builder` for sections inside chart (`shrinkWrap` + non-scrollable physics inside outer scroll) |

### Out of scope

| Item | Phase |
|------|--------|
| Admin / editor layout | **10** |
| Changing wrap rules or transpose | **3** (frozen) |
| `InteractiveViewer` default zoom | Rejected — breaks wrap reflow on commit |

---

## 3. Architecture

### 3.1 Two-phase zoom

1. **Committed scale** (`SongScreen._scale`) drives `scaledFontSize`, `maxChars`, and chord offset layout.
2. **`ChordChartViewport`** holds ephemeral `_liveScale` during pinch.
3. **Visual factor** = `displayScale / committedScale` applied via `Transform.scale(alignment: topCenter)`.
4. **On scale end**, if pinch armed → `onPinchCommit(liveScale)` → one reflow + remeasure.

### 3.2 Files

| File | Change |
|------|--------|
| `widgets/chord_chart_viewport.dart` | Local pinch state, transform, activation, indicator |
| `song_screen.dart` | `onPinchCommit` only; `ListView.builder` sections |
| `layout/chord_label_measure.dart` | Offset measurement cache |
| `widgets/chord_line.dart` | `RepaintBoundary` per line |
| `test/features/song/chord_chart_viewport_test.dart` | Pinch commit smoke test |

---

## 4. Acceptance criteria (DoD)

| # | Criterion |
|---|-----------|
| 1 | Pinch in/out on a 40+ line song: **no full-screen rebuild every frame** (viewport `setState` only while fingers down). |
| 2 | After pinch release, chord positions match **button zoom** at same scale percent (within snap step). |
| 3 | Vertical scroll during single-finger drag remains usable on chart area. |
| 4 | Autoscroll active → pinch disabled (`gesturesEnabled: false`) unchanged. |
| 5 | `flutter test` includes viewport pinch test; existing domain/layout tests green. |
| 6 | Manual matrix: small phone, large phone, tablet width — wrap + zoom at 0.85×, 1.0×, 1.5×. |

---

## 5. Manual QA script

1. Open a long song in a playlist session (wrap enabled).
2. Pinch slowly — zoom should not “jump” until fingers move enough (activation).
3. Pinch quickly in/out — motion smooth; on release, text reflows once; chords align with lyrics.
4. Double-tap preset toggle (1 ↔ 1.5) still works.
5. Zoom buttons ±0.1 — indicator flashes; layout updates.
6. Start autoscroll — pinch does nothing; stop autoscroll — pinch works again.

---

## 6. Follow-ups (optional P1)

| Item | Notes |
|------|--------|
| Golden tests at multiple scales | Phase 3 P2 / Phase 8 |
| Further split `SongScreen` chart subtree | Reduce transpose/control bar rebuilds |
| `measureChordLabelWidths` cache in `ChordRowWidget` | Same pattern as offsets |

---

## 7. References

- Web: `webmvp/src/lib/hooks/useChartZoom.ts`, `webmvp/src/components/ChordChartViewport.tsx`
- Mobile Phase 3: [`flutter-phase-3-song-chart.md`](flutter-phase-3-song-chart.md)
