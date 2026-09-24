# Flutter Phase 3 — Song chart (read-only): transpose, numbers, zoom, live updates

**Parent:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 3  
**Parity specs:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.4, data §4.2, limits §1 · route query `playlist` / `index` / `key` (map §2.1) · [`flutter-web-app-map-verification.md`](flutter-web-app-map-verification.md) when present  
**Roadmap alignment:** Phase 3 user stories; matrix §3 — chart, transpose, numbers, **zoom (P0)**, live snapshot, playlist query params (parsing P0; prev/next UI Phase 4)  
**Depends on:** [Phase 1](flutter-phase-1-auth.md) (routing, auth), [Phase 2](flutter-phase-2-library.md) (home → `/song/:id`, index for recent validation)  
**Backend:** Firestore `songs/{id}` — read when `status == 'active'` (`firestore.rules`)

**Goal:** Replace the Phase 2 song **placeholder** with a **production chart screen** matching web: live Firestore song, sections/lines/chords, transpose and Nashville numbers, pinch/button zoom, playlist query context (read-only session songs for key override). **Local-first:** `snapshots()` + disk cache via `getSong` fallback pattern.

**Estimate:** 3–4 person-weeks (1 FTE) — highest technical risk in v1 (layout + fonts).

---

## 1. Scope summary

### In scope (Phase 3)

| Area | Web reference | Flutter deliverable |
|------|---------------|---------------------|
| Live song load | `useSongLive.ts` | `SongRepository.watchSong(id)` → `Stream<Song?>`; only `status == 'active'` |
| Offline / cache read | `songs.getSong` | One-shot `getDoc` cache-first + `getDocFromServer` fallback (same as web) |
| Firestore → UI model | `toSong.ts`, `chordMarks.normalizeSections` | `firestore_song_mapper.dart` |
| Transpose key | `keyUtils.transposeKeyBy`, `targetKey` state | Key +/- and **`KeySelectModal`** (full key grid) |
| Transpose chords | `engine.transposeChord` | Per-mark display labels |
| Nashville numbers | `engine.chordToDegree`, `SongViewMode` | Toggle chords ↔ numbers |
| Sections UI | `ChordLine`, section labels | `SectionHeader` + list of lines |
| Chord-over-lyric layout | `chordLayout`, `ChordRow`, `wrapLyricLine`, `graphemeUtils` | Custom `TextPainter` / skyline layout |
| Chart zoom | `useChartZoom`, `performancePreferences` | Pinch + buttons; `lf-zoom-level`, session zoom keys — **Phase 3.5:** transform live pinch, commit reflow ([`flutter-phase-3.5-chart-ux.md`](flutter-phase-3.5-chart-ux.md)) |
| Chart layout width | `useChartLayout`, `charsPerLine` | `LayoutBuilder` + `maxChars` wrap |
| Control bar (musician) | `SongControlBar` (subset) | Transpose, view mode, zoom — **no** autoscroll/fullscreen yet |
| Header | `SongHeader` | Back, title, artist (`compact` on phone) |
| Query `key` | URL `?key=` | Sets initial `targetKey` when valid `Key` |
| Playlist context | `sessionNavigation.ts`, `parseSessionNavParams` | Parse `playlist` / legacy `session`, `index`; canonical redirect |
| Session songs for set | `listSessionSongs`, `getSession` | **Read-only** when `playlist` param set (for `keyOverride`, position, Phase 4 nav) |
| Recent songs | `recordRecentSong` | On successful load (once per song id) |
| Share song | `sharePlaylist.shareSongNative` | **P1:** `share_plus` with `https://{host}/song/{id}` |
| Fonts (Indic lyrics) | `Noto_Sans_Malayalam`, `Noto_Sans_Devanagari` | **P1:** `google_fonts` on lyric text (roadmap open question: Yes for v1) |
| Live admin publish | `useSongLive` snapshot | UI updates when `version`/sections change on server |

### Out of scope (Phase 3 → later phases)

| Item | Phase |
|------|--------|
| Performance mode, autoscroll, wake lock, immersive fullscreen | **4** (`§3.5`) |
| Swipe prev/next in set, `PerformanceBottomBar` | **4** (web swipe exists on song page — implement with playlist nav in 4) |
| Chart theme cycle (`system` / `dark` / `stage`, `data-chart-theme`) | **4** (matrix groups “zoom + chart theme”; **zoom** is Phase 3, **theme cycle** Phase 4) |
| `PerformanceBottomBar`, session title/position in footer | **4** |
| Add to playlist modal | **5** |
| Admin draft banner, `songEdits`, edit link | Never |
| Guest `getLocalSong` / `storage.ts` | Never |
| `chordProParser` full import UI | Never (port **`isChordOnlyLine`** only for display) |
| Playlist CRUD, join API | **5** |

### Mobile vs web (intentional)

| Topic | Web | Flutter Phase 3 |
|-------|-----|------------------|
| Song URL | `/song/[id]` | `/song/:id` |
| Home back link | `/` | `/home` |
| Live updates | TanStack Query + `onSnapshot` | Riverpod `StreamProvider` / repo stream |
| Chord measurement | DOM `useLyricChordOffsets` | `TextPainter` + grapheme-safe indices (`characters` package) |
| Line wrap | `wrapEnabled={performanceMode}` (viewport &lt;768 or `?playlist=`) | **Phase 3:** enable wrap on typical phone widths and/or when `playlist` query set (same rule as `usePerformanceMode`), without autoscroll/fullscreen |
| Performance chrome | Autoscroll, fullscreen, bottom bar | **Phase 4** |
| Not found copy | Guest vs signed-in message | Same intent; link to `/home` |

---

## 2. Web behavior checklist (must match)

Sources: `song/[id]/page.tsx`, `useSongLive.ts`, `songs.getSong`, `ChordLine.tsx`, `ChordRow.tsx`.

### 2.1 Loading & auth gating

1. Wait for **auth bootstrap** (`authLoading` false) before deciding Firestore vs local — mobile: **always Firestore** (no local songs).
2. Enable live listener when `songId` non-empty and Firebase configured.
3. **`useSongLive` mapping:** if doc missing or `status !== 'active'` → treat as **no song** (empty payload).
4. **Loading:** active listener and `readyId !== songId` and no error → loading (web `isLoading`).
5. **Guest:** active Firestore songs readable per rules; no fallback to localStorage.
6. **Not found:** show message; guest hint to sign in for “shared” copy optional — primary case is missing/archived song.

### 2.2 Live updates

1. `onSnapshot` on `songs/{id}` updates chart when admin publishes new version.
2. Reset “record recent” guard when `id` changes.
3. On snapshot error: surface error; still mark ready (web sets `readyId` on error).

### 2.3 Target key & transpose

1. On load / when `song.id` or `originalKey` changes: if `?key=` is valid `Key`, set **targetKey**; else set **targetKey** to `song.originalKey` (web `useEffect` on `[loaded, song?.id, song?.originalKey, keyParam]`).
2. **Playlist key override:** web passes override via **`?key=`** on the URL (`sessionSongHref` adds `key` when `sessionSongs[].keyOverride` is set). Phase 3 must parse query `key` — do not rely on a separate client fetch to apply override unless URL lacks `key` (optional enhancement).
3. **currentKey** = `isKey(targetKey) ? targetKey : originalKey` (used in control bar); **ChordLine** on web receives `originalKey` + `targetKey` state (same as web props).
4. Transpose ±1 semitone: `transposeKeyBy(current, direction)`; optional flash feedback (web 900ms).
5. Display chords: `transposeChord(chord, originalKey, currentKey)` with try/catch fallback to raw chord (web `safeTranspose`).
6. Numbers mode: `chordToDegree(transposedOrRaw, currentKey)` per mark.

### 2.4 View mode

- `SongViewMode`: `"chords"` | `"numbers"` — toggle in control bar (default `"chords"`).
- Web `lf-view-mode` in `performancePreferences` is **scroll vs sections** (editor-style), not chords/numbers — **do not** conflate. Chords/numbers toggle is **session UI state** on web (not persisted). **P1 Flutter:** optional persist chords/numbers if product wants.

### 2.5 Sections & lines

1. `firestoreSongToSong`: `normalizeSections(sections)` on read.
2. For each section: render **label** + lines.
3. Each line: `ChordLine` — when **`wrapEnabled`** false, single segment (no wrap); when true, `wrapLyricLine(line, maxChars)`.
4. **`wrapEnabled`:** web `performanceMode` (`max-width: 767px` OR `playlist` query). Flutter: same boolean for parity (phone + playlist).
5. **`useChartLayout`:** enabled when `performanceMode` on web — drives `maxChars` from container width × scale (`BASE_FONT_SIZE` 18, `charsPerLine`). Phase 3: run layout when wrap enabled.
6. **Chord-only lines:** `isChordOnlyLine` → packed horizontal chord row (`PACKED_CHORD_GAP_PX` 12).
7. **Lyric lines:** `measureChordOffsets` / `useLyricChordOffsets` → anchor pixels → `useChordRowLayout` → `resolveChordLayout` (skyline tiers).
8. **Accessibility P1:** `aria-label` on lines with lyrics (chords + lyrics summary) like web.

### 2.6 Zoom

Port `performancePreferences` zoom subset:

| Key | Purpose |
|-----|---------|
| `lf-zoom-level` | Global zoom |
| `lf-session-{sessionId}-zoom` | Override when `playlist` query set |

- Constants: `CHART_SCALE_MIN` 0.65, `CHART_SCALE_MAX` 2, `CHART_SCALE_STEP` 0.05, `snapChartScale`, `clampChartScale`.
- Pinch: live scale during gesture (`setScaleLive`, clamp only), **commit** on end (`commitScale` → persist).
- Buttons: zoom in/out step **0.1** per tap (web `zoomIn`/`zoomOut`).
- **Double-tap:** `toggleZoomPreset` — 1.0 ↔ 1.5 (web `ChordChartViewport`).
- Pinch snapping uses `CHART_SCALE_STEP` 0.05 where applicable.
- Brief zoom indicator (~1.5s) optional.
- Scale applied in viewport (`scale` on chart container); font/layout recalc when scale changes.

### 2.7 Playlist query params (map P0 for Flutter)

| Param | Handling |
|-------|----------|
| `playlist` | Session id (preferred) |
| `session` | Legacy → redirect to `playlist` (`canonicalPlaylistSearchParams`) |
| `index` | Int ≥ 0, position in set |
| `key` | Initial display key |

When `playlist` present:

1. Load `getSession` + `listSessionSongs` (read rules: owner/shared/published/group — may fail for guest; handle gracefully).
2. `writeLastSessionIndex(sessionId, index)` when `index` valid (web).
3. **Back** target: `/playlists/{sessionId}` if in set context else **`/home`** (web uses `/`).
4. Load failures: empty session state; chart still works without set metadata.
5. **Session position label** (`1/12`) — web `PerformanceBottomBar` / fullscreen chrome → **Phase 4**; Phase 3 may show in app bar subtitle **P1**.
6. **Phase 4:** prev/next buttons, swipe (72px threshold), `buildAdjacentSongHref`; Phase 3 ports **href builders + tests** and loads `sessionSongs` for future nav.
7. Read ports: `getSession`, `listSessionSongs` from `sessionSongs.ts` / `sessions.ts` (read-only subset).

### 2.8 Recent songs

When `loaded && song`: call `recordRecentSong` once per `song.id` with title, artist, `originalKey`.

### 2.9 Metadata display (read-only)

- **Header:** title + artist from live payload (`artist` on Firestore doc, not on minimal `Song` model — mirror `LiveSongPayload.artist`).
- **ccli / copyright / notes / tempo:** not rendered on current web song page body — **out of scope** unless product adds later.

### 2.10 `getSong` vs stream

- **`watchSong`:** enforces `status == 'active'` (like `useSongLive`).
- **`getSong`:** returns doc if present **without** status filter in web — use only for cache/bootstrap; UI must still hide non-active.

### 2.11 Explicitly excluded (musician app)

- `getDraftForSong`, admin archive list, link to `/song/{id}/edit`.
- `AddToPlaylistModal` (Phase 5).
- `AutoscrollBar`, `PerformanceFullscreen`, `usePerformanceMode` hooks.

---

## 3. Data model

### Firestore `songs/{songId}` → `Song` (chart UI)

| Firestore field | Chart model |
|-----------------|-------------|
| `title` | `title` |
| `artist` | `artist` (display only) |
| `originalKey` | `originalKey` |
| `sections` | `sections[]` with `LyricLine` + `ChordMark` |
| `status` | Must be `active` to show |
| `version` | Optional live-update indicator / debug |

`ChordMark`: `chord`, `start`, `end`, optional legacy `position` — normalize via `chordMarks`.

### Repository API (sketch)

```dart
Stream<LiveSongPayload> watchSong(String songId);
Future<FirestoreSong?> getSong(String songId); // cache-first
```

`LiveSongPayload`: `song`, `artist`, `version` (mirror web).

---

## 4. Local-first & offline

| Principle | Implementation |
|-----------|----------------|
| **Live stream** | Primary UX; updates chart when online |
| **Persistence** | Firestore SDK cache serves last `getDoc` / snapshot when offline after prior view |
| **getSong fallback** | Port web try `getDoc` → catch → `getDocFromCache` for explicit one-shot (Phase 6 prefetch uses same) |
| **No localStorage songs** | Firebase-only |

---

## 5. Dependencies (`pubspec.yaml`)

Add to Phase 3 (in addition to Phase 1–2):

```yaml
dependencies:
  google_fonts: ^6.2.0      # Indic lyric scripts (map §3.4)
  characters: ^1.3.0        # grapheme-safe offsets (port graphemeUtils)
  share_plus: ^10.0.0         # P1 song share
```

No new Firebase packages beyond existing `cloud_firestore`.

---

## 6. Architecture (Flutter)

### 6.1 Folder layout

```
mobile/lib/
  domain/
    engine.dart                 # transposeChord, chordToDegree, parseChord, ALL_KEYS
    key_utils.dart
    chord_marks.dart
    chord_layout.dart
    wrap_lyric_line.dart
    grapheme_utils.dart
    lyric_chords.dart
    chord_pro_display.dart      # isChordOnlyLine only
    session_navigation.dart
    performance_preferences.dart  # zoom keys (+ read view mode)
  data/
    models/song.dart, section.dart, chord_mark.dart
    models/firestore_song.dart
    repositories/song_repository.dart
    mappers/firestore_song_mapper.dart
  features/song/
    song_screen.dart
    song_providers.dart
    widgets/
      song_header.dart
      song_control_bar.dart
      chord_chart_viewport.dart
      chord_line.dart
      chord_row.dart
      section_block.dart
  features/song/layout/
    chord_label_measure.dart    # TextPainter widths (port chordLabelMeasure)
    lyric_chord_layout.dart     # offsets + skyline
```

Replace Phase 2 `keys.dart` with full `engine.dart` exports (or re-export `Key` + `ALL_KEYS` from engine).

### 6.2 Riverpod (sketch)

| Provider | Role |
|----------|------|
| `songLiveProvider(id)` | `AsyncValue<LiveSongPayload>` from stream |
| `songTargetKeyProvider` | `Notifier` for display key |
| `songViewModeProvider` | chords / numbers |
| `chartZoomProvider(sessionId?)` | scale + persist |
| `chartLayoutProvider` | `maxChars` from width × scale |
| `playlistContextProvider` | Optional session + sessionSongs when query set |

### 6.3 Routing

| Route | Change |
|-------|--------|
| `/song/:id` | Replace placeholder with `SongScreen` |
| Query | `key`, `playlist`, `index`, legacy `session` |

**Shell:** Full-screen route above bottom nav (Phase 2 recommendation).

**Deep link (Phase 8):** `https://lfchords.vercel.app/song/{id}` → same route.

---

## 7. Sub-phases (implementation order)

### Phase 3A — Engine & marks (3–4 days)

- [ ] Port `engine.dart` + `key_utils.dart` + unit tests from `engine.test.ts`, `keyUtils.test.ts`.
- [ ] Port `chord_marks.dart` (+ tests); `normalizeSections`.

### Phase 3B — Layout & wrap (4–5 days)

- [ ] Port `chord_layout.dart`, `wrap_lyric_line.dart`, `grapheme_utils.dart` (+ golden/unit tests).
- [ ] Port `chord_label_measure` using `TextPainter`.
- [ ] `isChordOnlyLine` helper.

### Phase 3C — Song repository (2–3 days)

- [ ] `watchSong` snapshot stream + active-only filter.
- [ ] `getSong` cache fallback.
- [ ] Mapper to `Song` model.

### Phase 3D — Chart widgets (5–7 days)

- [ ] `ChordRow` + `ChordLine` + section list.
- [ ] `ChordChartViewport` with pinch zoom wiring.
- [ ] `useChartLayout` equivalent (`maxChars`, wrap).

### Phase 3E — Song screen shell (3–4 days)

- [ ] `SongHeader`, `SongControlBar` (transpose, mode, zoom, share P1); **`KeySelectModal`**.
- [ ] Loading / error / not found.
- [ ] `recordRecentSong` integration.

### Phase 3F — Playlist query context (2 days)

- [ ] Parse params; canonical `session` → `playlist`.
- [ ] Load session songs; key override; back link; `writeLastSessionIndex`.
- [ ] Port `session_navigation.dart` tests.

### Phase 3G — Fonts & share (1–2 days, P1)

- [ ] Apply Noto families to lyric text when tags indicate language (or default lyric font stack).
- [ ] `share_plus` song URL.

### Phase 3H — QA & goldens (2–3 days)

- [ ] Golden tests for sample section (C, Am, packed chord-only line).
- [ ] Manual: transpose, numbers, live edit from web admin, offline reopen cached song.

---

## 8. Testing plan

| Layer | What |
|-------|------|
| Unit | `engine`, `key_utils`, `chord_layout`, `wrap_lyric_line`, `grapheme_utils`, `chord_marks`, `session_navigation` |
| Golden | `ChordRow` / line widget with fixed width |
| Widget | `SongScreen` with mocked stream provider |
| Manual | Guest opens song from home; transpose ±; numbers toggle; pinch zoom persists restart |
| Manual | `?playlist=&index=&key=` deep link (with readable session) |
| Manual | Malayalam/Hindi lyric sample if in library |

---

## 9. Definition of done (Phase 3)

- [ ] Real Firestore chart for active songs; archived/missing → not found.
- [ ] Live snapshot updates UI when song doc changes.
- [ ] Transpose and Nashville numbers match web output for fixture songs (unit tests).
- [ ] Pinch + button zoom within min/max; global zoom persisted.
- [ ] Playlist query params parsed; legacy `session` rewritten; `listSessionSongs` loaded when allowed; back navigates to playlist or home.
- [ ] Line wrap on phone / `?playlist=` matches `usePerformanceMode` rule.
- [ ] Double-tap zoom preset 1 ↔ 1.5.
- [ ] `recordRecentSong` on view.
- [ ] No admin/draft/localStorage paths.
- [ ] **P1:** Share song link; Indic fonts on lyrics.
- [ ] `flutter test` + analyze clean; roadmap Phase 3 marked complete.

---

## 10. Roadmap & feature matrix traceability

| Roadmap story | Section |
|---------------|---------|
| Open song, show sections | §2.5, 3D |
| Change key, transpose chords | §2.3 |
| Toggle Nashville numbers | §2.3–2.4 |
| Pinch/zoom chart | §2.6 |
| Live update when doc changes | §2.2 |
| Matrix: song chart, transpose, numbers, zoom, live snapshot (P0) | §1 |
| Matrix: playlist nav query (P0) | §2.7 (parse + data; nav UI Phase 4) |
| Matrix: zoom (P0); chart theme (P0 with §3.5) | §2.6 zoom; theme Phase 4 |
| Matrix: song share URL (P1) | §3G |

---

## 11. Web file → Flutter port map

| Web file | Flutter target |
|----------|----------------|
| `hooks/useSongLive.ts` | `song_repository.dart` + `songLiveProvider` |
| `firestore/songs.ts` (`getSong` read) | same repository |
| `firestore/toSong.ts` | `firestore_song_mapper.dart` |
| `engine.ts` | `domain/engine.dart` |
| `keyUtils.ts` | `domain/key_utils.dart` |
| `chordMarks.ts` | `domain/chord_marks.dart` |
| `chordLayout.ts` | `domain/chord_layout.dart` |
| `wrapLyricLine.ts` | `domain/wrap_lyric_line.dart` |
| `graphemeUtils.ts` | `domain/grapheme_utils.dart` |
| `lyricChords.ts` | `domain/lyric_chords.dart` |
| `chordLabelMeasure.ts` | `chord_label_measure.dart` |
| `hooks/useChordRowLayout.ts` | `chord_row.dart` / layout helper |
| `hooks/useLyricChordOffsets.ts` | `lyric_chord_layout.dart` |
| `lib/lyricMeasurement.ts` | measure chord anchors (`TextPainter`) |
| `hooks/useChartLayout.ts` | song layout provider |
| `hooks/useChartZoom.ts` | `chart_zoom_provider` |
| `hooks/usePerformanceMode.ts` | `wrapEnabled` + layout gate (logic only in Phase 3) |
| `components/KeySelectModal.tsx` | `key_select_modal.dart` |
| `performancePreferences.ts` | zoom + session index prefs (subset) |
| `sessionNavigation.ts` | `domain/session_navigation.dart` |
| `recentSongs.ts` | existing Phase 2 service |
| `components/ChordLine.tsx` | `chord_line.dart` |
| `components/ChordRow.tsx` | `chord_row.dart` |
| `components/ChordChartViewport.tsx` | `chord_chart_viewport.dart` |
| `components/SongHeader.tsx` | `song_header.dart` |
| `components/SongControlBar.tsx` | `song_control_bar.dart` (trim performance buttons) |
| `app/(app)/song/[id]/page.tsx` | `song_screen.dart` |
| `sharePlaylist.ts` (`shareSongNative`) | P1 share helper |
| `chordProParser.ts` (full) | **No** — `isChordOnlyLine` only |
| `firestore/songEdits.ts` | **No** |
| `storage.ts` | **No** |

### Domain ports checklist (roadmap Phase 3)

| Web module | Phase 3 |
|------------|---------|
| `engine.ts` | **Yes** |
| `keyUtils.ts` | **Yes** |
| `chordLayout.ts` | **Yes** |
| `wrapLyricLine.ts` | **Yes** |
| `graphemeUtils.ts` | **Yes** |
| `lyricChords.ts` | **Yes** |
| `chordMarks.ts` | **Yes** (read normalize) |
| `sessionNavigation.ts` | **Yes** (href builders; UI nav Phase 4) |
| `firestore/sessionSongs.ts` (`listSessionSongs`) | **Yes** (read, Phase 3F) |
| `firestore/sessions.ts` (`getSession`) | **Yes** (read, Phase 3F) |

---

## 12. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Layout parity vs web DOM | Port tests from `chordLayout.test.ts`; golden screenshots |
| Indic shaping | `google_fonts` + `characters`; manual QA on tagged songs |
| TextPainter perf on long songs | ListView builder per section; avoid rebuilding entire chart on transpose (memoize by line) |
| Playlist context without Phase 5 UI | Read-only Firestore; graceful empty if permission denied |
| `useSongLive` vs cache | Stream + optional initial `getSong` for faster first paint P1 |
| Phase 2 `keys.dart` duplicate | Merge into `engine.dart` in 3A |
| Wrong key from session without `?key=` | Match web: override only via URL from `sessionSongHref` |
| `targetKey` vs `currentKey` in widgets | Match web `ChordLine` props |

---

## 12b. Audit notes (map / web cross-check)

| Check | Status in this doc |
|-------|-------------------|
| Map §3.4 load, transpose, numbers, zoom, sections, live | §2.1–2.6, §2.5 |
| Map §3.4 playlist context, swipe, share | Query + data §2.7; swipe/share Phase 4 / P1 |
| Map §3.4 admin draft banner | Excluded §2.11 |
| Map §3.4 guest song read, no localStorage fallback | §2.1 |
| Rules `songs` read if `active` | §2.1, §2.10 |
| `firestoreSongToSong` + `normalizeSections` | §2.5, §3 |
| Roadmap Phase 3 five user stories | §10 |
| Matrix zoom P0 vs chart theme with §3.5 | Split §1 out-of-scope |
| `usePerformanceMode` wrap on mobile web | §2.5 item 4 |
| `SongHeader` back `/` → `/home` on Flutter | §2.7 |

---

## 13. What comes next (not Phase 3 gaps)

| Web map | Phase |
|---------|--------|
| §3.5 Performance (autoscroll, wakelock, immersive, chart theme cycle) | 4 |
| §3.6 Playlists UI + add to playlist | 5 |
| §3.6 offline `cacheSessionOffline` | 6 |
| Swipe between set songs + bottom bar | 4 |

---

## 14. After Phase 3

- **Phase 4:** [`flutter-phase-4-performance.md`](flutter-phase-4-performance.md) — autoscroll, wakelock, immersive UI, chart theme, playlist prev/next + swipe on song screen.
- **Phase 2 doc:** Song placeholder removed; home taps open real chart.

---

*End of Phase 3 plan.*
