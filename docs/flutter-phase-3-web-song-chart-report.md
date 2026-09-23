# Web MVP song chart parity report (Phase A)

**Purpose:** Ground-truth behavior of `webmvp/` song chart for Flutter Phase 3.  
**Generated:** Phase A code read (no Flutter chart UI in this pass).  
**Cross-check:** [`flutter-phase-3-song-chart.md`](flutter-phase-3-song-chart.md) §2, [`flutter-roadmap.md`](flutter-roadmap.md) Phase 3.

---

## 1. Route & query params

| Param | Web behavior | Citation |
|-------|----------------|----------|
| Path | `/song/[id]` — `id` from `useParams()` | `page.tsx:53-56` |
| `playlist` | Preferred session id for set context | `sessionNavigation.ts:3-4`, `parseSessionNavParams` `35-36` |
| `session` | Legacy alias; same parse as `playlist` | `sessionNavigation.ts:34-36` |
| `index` | 0-based position in set; required with session id for parsed index | `sessionNavigation.ts:37-45` — if `index` missing/NaN/negative → `index: null` but `sessionId` may still parse |
| `key` | URL search param read as `keyParam`; if valid `Key`, sets `targetKey` on load | `page.tsx:57`, `185-194`; `keyUtils.isKey` `12-14` |

**Canonical redirect:** If `session=` present and `playlist=` absent, replace URL with `playlist=` same value (`sessionNavigation.ts:61-72`). Effect: `router.replace(\`/song/${id}?${canonical}\`)` (`page.tsx:104-108`).

**Href builder:** `sessionSongHref(sessionId, entry, index)` → `/song/{songId}?playlist=…&index=…` plus `&key=` when `entry.keyOverride` set (`sessionNavigation.ts:6-18`). Tests: `sessionNavigation.test.ts` — `"parses playlist params"`, `"parses legacy session params"`, `"builds song href with playlist context"`, `"builds adjacent hrefs"`.

**Flutter mobile path:** `/song/:id` (Phase 2); back link uses `/home` when not in playlist context (Phase 3 doc §1 intentional).

---

## 2. Load lifecycle

### Auth & Firestore gate

| Step | Behavior | Citation |
|------|----------|----------|
| Auth wait | `PageLoading` while `!loaded \|\| authLoading` | `page.tsx:330-332` |
| Enable live hook | `useFirestore = isFirebaseEnabled() && !authLoading` | `page.tsx:63-64` |
| Live hook | `useSongLive(id, useFirestore)` | `page.tsx:64` |

### `loaded` composition

```text
loaded = !authLoading && (useFirestore ? !liveSong.isLoading && localResolved : localResolved)
```

(`page.tsx:68-69`)

### Local resolution effect (Firebase path)

After auth: if `liveSong.isLoading` → `localResolved = false` (`page.tsx:172-174`). When live finished: if `!liveSong.song && !user` → try `getLocalSong(id)`; else `localSong = null` (`page.tsx:177-181`). Then `localResolved = true` (`page.tsx:182`).

**Flutter note:** Musician app **never** uses `storage.ts` / `getLocalSong` — only Firestore path when Firebase configured (`page.tsx:165-169` non-Firebase branch is irrelevant for Flutter).

### Loading vs ready (`useSongLive`)

- On subscribe: reset `readyId`, clear error, seed query cache `EMPTY_PAYLOAD` (`useSongLive.ts:57-59`).
- **`isLoading`:** `isActive && readyId !== songId && !subscriptionError` (`useSongLive.ts:99`).
- First snapshot (or error callback): `setReadyId(songId)` (`useSongLive.ts:70`, `74`).

### Not found UI

When `loaded && !song`: heading **"Song not found"**; body guest vs signed-in (`page.tsx:334-341`):

- Signed-in: `"No song matches this link."`
- Guest: `"Sign in to view shared songs, or open a song saved on this device."` (localStorage hint — **omit localStorage half on Flutter**)
- Link **← Home** → `/` (`page.tsx:343-348`)

### Error surface

`useSongLive` exposes `error: subscriptionError ?? songQuery.error` (`useSongLive.ts:100`). Song page does **not** render a dedicated error panel for snapshot errors today — still exits loading via `readyId` on error (`useSongLive.ts:72-75`).

---

## 3. Active-only rule

| Path | Filter | Citation |
|------|--------|----------|
| **`useSongLive` / UI** | `mapSongDoc`: if `!data \|\| data.status !== "active"` → `EMPTY_PAYLOAD` (no song) | `useSongLive.ts:31-32` |
| **`getSong`** | Returns doc if exists — **no** `status` check | `songs.ts:81-85` |
| **Rules** | Client read allowed only when `resource.data.status == 'active'` | `firestore.rules:29-30` |

Archived/missing docs: live hook yields null song → not-found UX (unless guest localStorage fallback on web).

---

## 4. Live updates

| Behavior | Citation |
|----------|----------|
| Listener | `onSnapshot(doc(getDb(), "songs", songId))` | `useSongLive.ts:61-62` |
| Payload | `firestoreSongToSong` + `artist`, `version` from Firestore | `useSongLive.ts:35-39`, `toSong.ts:4-10` |
| Cache | TanStack Query `setQueryData`; `staleTime: Infinity` | `useSongLive.ts:83-90` |
| Recent guard reset | `recordedRecentRef.current = null` when `id` changes | `page.tsx:129-131` |
| Record recent once | When `loaded && song`, if ref !== `song.id`, record and set ref | `page.tsx:144-157` |
| Admin draft reload | Separate effect refetches draft/archives when `liveSong.version` changes | `page.tsx:196-220` — **Phase 3 skip** |

---

## 5. Target key & transpose

| Rule | Citation |
|------|----------|
| Initial key | After load: if `keyParam && isKey(keyParam)` → `setTargetKey(keyParam)`; else if `isKey(song.originalKey)` → `setTargetKey(song.originalKey)` | `page.tsx:185-194` |
| Playlist override | Applied via URL: `sessionSongHref` adds `key` from `keyOverride` (`sessionNavigation.ts:15-17`) — not a separate client merge on song page |
| **currentKey** (control bar) | `isKey(targetKey) ? targetKey : originalKey` | `page.tsx:353-354` |
| **ChordLine props** | Receives `originalKey` + `targetKey` state strings | `page.tsx:494-496` |
| ± transpose | `transposeKeyBy(current, direction)`; flash 900ms | `page.tsx:257-266`, `262-264` |
| Key modal | `KeySelectModal` — grid `ALL_KEYS`, shows original | `KeySelectModal.tsx:52-60`, `page.tsx:431-437` |
| Chord display | `safeTranspose(mark.chord, originalKey, targetKey)` | `ChordRow.tsx:46-51`, `62-70` |
| **Numbers display** | `safeDegree(mark.chord, originalKey)` — **not** `targetKey` | `ChordRow.tsx:54-58`, `68-70` |

**Worked example A — transpose C→D:** Song in key C, user taps + once → `targetKey` D; mark `"C"` displays `transposeChord("C","C","D")` → `"D"` (`engine.test.ts` `"transposes C → D"`).

**Worked example B — numbers in key G:** `viewMode === "numbers"` → `chordToDegree(mark.chord, originalKey)` with **`originalKey` from song**, not transposed key (`ChordRow.tsx:68-70`). Nashville mapping tests in `engine.test.ts` `"maps diatonic chords in key C to Nashville numbers"`.

---

## 6. View mode (chords vs numbers)

| Concept | Web | Citation |
|---------|-----|----------|
| Chart toggle | `SongViewMode` `"chords" \| "numbers"` in React state, default `"chords"` | `page.tsx:71`, `SongControlBar` segment `78-99` |
| **Not the same as** | `readViewMode()` / `lf-view-mode` = `"scroll" \| "sections"` (editor) | `performancePreferences.ts:85-91` — **unused on song page** for chords/numbers |

Phase 3: port chords/numbers toggle only; do not wire `lf-view-mode` scroll/sections.

---

## 7. Sections rendering pipeline

1. **Normalize on read:** `firestoreSongToSong` → `normalizeSections(song.sections)` (`toSong.ts:9`, `chordMarks.ts:71-75`).
2. **Section shell:** `section.label` + map lines (`page.tsx:487-501`).
3. **Per line:** `ChordLine` (`ChordLine.tsx:73-114`).
4. **Wrap split:** If `!wrapEnabled` → single segment with full line (`ChordLine.tsx:81-88`). If `wrapEnabled` → `wrapLyricLine(line, maxChars)` (`ChordLine.tsx:90`, `wrapLyricLine.ts:38-88`).
5. **Chord-only:** `isChordOnlyLine` = chords present and empty trimmed lyrics (`chordProParser.ts:8-10`) → `packed` layout on `ChordRow` (`ChordLine.tsx:50`, `ChordRow.tsx:176-178`).
6. **Lyric line:** Measure lyric DOM → `useLyricChordOffsets` → pixel anchors (`useLyricChordOffsets.ts:39-46`, `lyricMeasurement` via import).
7. **Skyline:** `useChordRowLayout` → `resolveChordLayout` with default `gap = 5`, `maxTiers = 2` (`chordLayout.ts:37-46`, `useChordRowLayout.ts:27-31`).
8. **Tier step:** `TIER_STEP_EM = 1.35` (`ChordRow.tsx:44`, `191-194`).

### Layout constants (cite for Flutter ports)

| Constant | Value | Source |
|----------|-------|--------|
| `BASE_FONT_SIZE` | 18 | `useChartLayout.ts:8` |
| `MONO_CHAR_WIDTH_RATIO` | 0.602 | `wrapLyricLine.ts:10` |
| `charsPerLine` | `max(12, floor(width / (fontSize * ratio)))` | `wrapLyricLine.ts:12-16` |
| Layout font size | `BASE_FONT_SIZE * clamp(scale, CHART_SCALE_MIN, CHART_SCALE_MAX)` | `useChartLayout.ts:26-27` |
| `PACKED_CHORD_GAP_PX` | 12 | `ChordRow.tsx:15` |
| Skyline default gap | 5 | `chordLayout.ts:44` |
| Max tiers | 2 | `chordLayout.ts:45` |
| Default `maxChars` | 32 | `ChordLine.tsx:79`, `useChartLayout.ts:12` |

**Worked example C — wrapped line with 2 chord marks:** Long lyric with marks at indices 10 and 40; `wrapLyricLine` splits at word boundary (`wrapLyricLine.ts:67-73`), remaps chords per segment via `chordsForSegment` (`wrapLyricLine.ts:19-35`). Test: `wrapLyricLine.test.ts` `"remaps chord positions per segment"`.

---

## 8. `wrapEnabled` truth table

**Source:** `performanceMode = usePerformanceMode(sessionId)` (`page.tsx:85`, `497`).

`usePerformanceMode` (`usePerformanceMode.ts:7-22`):

```text
wrapEnabled (= performanceMode) = (viewport width < 768px) OR (sessionId !== null)
```

| Viewport | `playlist` / session query | `wrapEnabled` |
|----------|----------------------------|---------------|
| ≥768px, no playlist | false |
| <768px, no playlist | true |
| any width, playlist param set | true |

**`useChartLayout`:** `enabled === performanceMode` — when false, `maxChars` stays default 32 but wrap is off so unused (`useChartLayout.ts:14-17`, `page.tsx:87`).

Phase 3 Flutter: replicate boolean (phone breakpoint + playlist query), **without** importing Phase 4 autoscroll/fullscreen.

---

## 9. Zoom spec

From `performancePreferences.ts` + `useChartZoom.ts` + `ChordChartViewport.tsx`:

| Item | Value / behavior | Citation |
|------|------------------|----------|
| Global key | `lf-zoom-level` | `performancePreferences.ts:3`, `20-36` |
| Session key | `lf-session-{sessionId}-zoom` | `performancePreferences.ts:39-58` |
| Min / max | 0.65 / 2 | `performancePreferences.ts:7-8` |
| Step / snap | 0.05; `snapChartScale` | `performancePreferences.ts:9`, `15-17` |
| Initial | Session zoom if set, else global | `useChartZoom.ts:26-30` |
| Pinch live | `clampChartScale` only (no snap until commit) | `useChartZoom.ts:68-75` |
| Pinch commit | `snapChartScale(scaleRef.current)` + persist | `useChartZoom.ts:78-79` |
| Buttons | ± **0.1** per tap | `useChartZoom.ts:82-87` |
| Double-tap | `scale >= 1.4 ? 1 : 1.5` | `useChartZoom.ts:94-96` |
| Double-tap timing | 320ms window; move >28px cancels | `ChordChartViewport.tsx:20`, `127-141` |
| Pinch activation | 14px movement before arming | `ChordChartViewport.tsx:19`, `94-98` |
| Indicator | ~1500ms | `useChartZoom.ts:48-50` |
| CSS scale | `--chart-scale` on viewport | `ChordChartViewport.tsx:164` |
| Gestures off when autoscroll | `gesturesEnabled={!autoscroll.active}` | `page.tsx:483` — Phase 3 always enabled |

Tests: `performancePreferences.test.ts` — `"clamps zoom scale"`, `"snaps zoom scale to step"`.

---

## 10. Playlist context when `playlist` set

| Step | Behavior | Citation |
|------|----------|----------|
| Parse | `sessionId`, `sessionIndex` from query | `page.tsx:58`, `sessionNavigation.ts:31-45` |
| Load | `getSession(sessionId)` + `listSessionSongs(sessionId)` parallel | `page.tsx:233-236` |
| Failure | `catch` → `session` and `sessionSongs` null/empty | `page.tsx:244-248` |
| Last index | `writeLastSessionIndex(sessionId, sessionIndex)` when index valid | `page.tsx:240-241`, `performancePreferences.ts:94-98` |
| Back | `backHref = sessionId ? /playlists/{id} : /` | `page.tsx:370-371` |
| Position label | `sessionPosition` string for bottom bar / fullscreen | `page.tsx:363-366`, `521-538` — **Phase 4 UI** |
| Prev/next hrefs | `buildAdjacentSongHref` | `page.tsx:355-361`, `289-304` |
| Swipe nav | 72px threshold on main | `page.tsx:322-325`, `307-327` — **Phase 4** |

Phase 3: port parsers, href builders, session+songs **read**, back target, `writeLastSessionIndex`; defer bottom bar, swipe, fullscreen chrome.

---

## 11. Control bar inventory (non-fullscreen song page)

**Rendered when:** `!(isMobile && autoscroll.active) && !fullscreen.active` (`page.tsx:408-429`).

| Control | Desktop (`showMobileControls=false`) | Mobile (`showMobileControls=true`) | Phase |
|---------|--------------------------------------|-------------------------------------|-------|
| Transpose − / key / + | Yes | Hidden (bottom bar has key) | **3** |
| Chords / Numbers toggle | Yes | Yes (top row only) | **3** |
| Zoom in/out | `ChartZoomButtons` | Bottom bar / not in slim mobile top bar | **3** |
| Original key label | Yes | No | **3** |
| Autoscroll toggle | Yes | Bottom bar | **4** |
| Fullscreen toggle | Yes | Bottom bar | **4** |
| Add to playlist | If `user` | If `user` | **5** |
| Share song | If `shareSong` prop | Same | **3 P1** |

**Mobile-only `PerformanceBottomBar`** when `isMobile && !autoscroll && !fullscreen` (`page.tsx:520-538`): key, zoom, theme cycle, session label/position, prev/next, autoscroll, fullscreen — **Phase 4** (except zoom/key overlap with Phase 3 goals).

---

## 12. Share & fonts

**Share:** `SongControlBar` passes `shareSong={{ id, title }}` (`page.tsx:427-428`). `shareSongNative` → URL `${origin}/song/${id}` (`sharePlaylist.ts:23-31`, `133-137`). Tests: `sharePlaylist.test.ts` (port URL/message helpers).

**Fonts:** Global CSS — lyric/chord rows use mono stack with `--font-noto-malayalam`, `--font-noto-devanagari` (`globals.css:123-128`, `217-228`). Fonts loaded in `layout.tsx:25-32` (`Noto_Sans_Malayalam`, `Noto_Sans_Devanagari`). Section labels use Lora serif (`globals.css:249-250`). Phase 3 P1: `google_fonts` on lyric text for Indic parity.

---

## 13. Worked examples (unit parity fixtures)

See §5 (transpose C→D, numbers with `originalKey`) and §7 (wrap + chord remap). Additional engine fixture: `"transposes Am → Bm (C → D)"` (`engine.test.ts:46-47`).

---

## 14. Test inventory (port to Dart for Phase 3)

### Must port (core)

| File | Describes / tests to port |
|------|---------------------------|
| `engine.test.ts` | `parseChord`, `transposeChord` (incl. C→D, C→G, slash, flats), `chordToDegree`, `isValidChord`, `getDiatonicChords` |
| `keyUtils.test.ts` | `transposeKeyBy`, `isKey`, `keyIndex` |
| `chordMarks.test.ts` | `normalizeChordMark`, `clampChordMarkToLyrics`, `normalizeSections`, `getMarkStart` |
| `chordLayout.test.ts` | All `resolveChordLayout` + `maxTierUsed` cases |
| `wrapLyricLine.test.ts` | `wrapLyricLine`, `charsPerLine`, legacy `position` marks |
| `graphemeUtils.test.ts` | `splitGraphemes`, `graphemeBoundaries`, `snapRangeToGraphemes`, `graphemeRangeAt` |
| `sessionNavigation.test.ts` | All five `it` blocks |
| `performancePreferences.test.ts` | `clampChartScale`, `snapChartScale` (theme tests optional Phase 4) |
| `lyricChords.test.ts` | `lyricChordStarts`, signature helpers if used |
| `chordProParser.test.ts` | **`isChordOnlyLine` only** (display) |
| `sharePlaylist.test.ts` | `songShareUrl`, `songShareMessage` shape |

### Optional / Phase 4+

| File | Reason skip |
|------|-------------|
| `useAutoscroll.test.ts`, `usePerformanceFullscreen.test.ts`, `useWakeLock.test.ts` | Phase 4 |
| `recentSongs.test.ts` | Covered Phase 2 mobile |
| Firestore integration tests | Manual / emulator later |

### Goldens (Phase 3H)

- Port `chordLayout.test.ts` placements as Dart unit tests; add widget/golden for one wrapped Malayalam/Indic line if fonts enabled.

---

## 15. Doc vs web (`flutter-phase-3-song-chart.md` §2)

| Topic | Verdict | Evidence |
|-------|---------|----------|
| Active-only live load | **ALIGNED** | §2.1 ↔ `useSongLive.ts:31-32` |
| No localStorage on Flutter | **DOC WINS** (product) | Web still has `getLocalSong` when `!useFirestore` or guest+no Firestore song (`page.tsx:165-178`) |
| Numbers use `currentKey` | **WEB WINS** | Doc §2.3 step 6 says `chordToDegree(..., currentKey)`; web uses **`originalKey`** (`ChordRow.tsx:68-70`) |
| `wrapEnabled` from performance mode | **ALIGNED** | Doc §2.5 ↔ `usePerformanceMode` + `page.tsx:497` |
| §2.11 “usePerformanceMode hooks” excluded | **DOC AMBIGUOUS** | Hook **boolean** required for wrap; exclude **autoscroll/fullscreen/theme DOM class** effects (`page.tsx:115-127`, `376-377`) |
| `getSong` cache-first comment | **PARTIAL** | Doc §2.10; web tries `getDoc` then cache on failure (`songs.ts:79-96`) — align Flutter with cache-first then server pattern from Phase 2 index |
| Back link `/` vs `/home` | **DOC WINS** (intentional) | Doc §1 mobile table |
| Phase 4 swipe 72px | **ALIGNED** | Doc §2.7 item 6 ↔ `page.tsx:322` |
| Guest not-found copy | **DOC WINS** (trim localStorage sentence) | §2.1 item 6 |

---

## 16. Intentional mobile diffs (from phase doc + report)

| Topic | Flutter Phase 3 |
|-------|-----------------|
| Home / back | `/home` when not in playlist context |
| Local songs | Never |
| Layout engine | `TextPainter` + grapheme package vs DOM measurement |
| Route | Full-screen `/song/:id` above bottom nav (Phase 2) |
| TanStack Query | Riverpod stream provider |
| Performance chrome | Omit until Phase 4 |
| Share host | Configurable base URL / deep link (P1) |

---

## 17. Proposed mobile-only changes (Phase A — optional follow-ups)

| Proposal | Rationale |
|----------|-----------|
| Optional: apply `keyOverride` from loaded `sessionSongs[index]` when URL lacks `?key=` | Web always encodes override in href; deep links might omit — product decision |
| Snapshot error banner on song screen | Web marks ready but does not show dedicated error UI — Flutter may improve UX without changing data rules |
| Persist chords/numbers view mode in prefs | Web does not; P1 in phase doc |

---

## Phase B — Flutter implementation map (2025-09-22)

| Web / plan | Flutter |
|------------|---------|
| `engine.ts` | `lib/domain/engine.dart` |
| `keyUtils.ts` | `lib/domain/key_utils.dart` (+ `keys.dart` re-export) |
| `chordLayout.ts` | `lib/domain/chord_layout.dart` + `features/song/layout/chord_label_measure.dart` |
| `wrapLyricLine.ts` | `lib/domain/wrap_lyric_line.dart` |
| `graphemeUtils.ts` | `lib/domain/grapheme_utils.dart` |
| `lyricChords.ts` / `chordMarks.ts` | `lib/domain/lyric_chords.dart`, `chord_marks.dart`, `chord_pro_display.dart`, `chart_display.dart` |
| `useSongLive` | `song_providers.dart` → `songLiveProvider` + `SongRepository.watchSong` |
| `songs.getSong` cache pattern | `SongRepository.getSongRaw` (server + cache fallback) |
| `sessionNavigation.ts` | `lib/domain/session_navigation.dart` |
| `performancePreferences` (zoom) | `lib/domain/performance_preferences.dart` |
| Song page | `lib/features/song/song_screen.dart` |
| Chart UI | `widgets/chord_chart_viewport.dart`, `chord_line.dart`, `chord_row.dart`, `song_header.dart`, `song_control_bar.dart` |
| Route | `app_router.dart` — `/song/:id` with query params → `SongScreen` |
| Mapper | `data/mappers/firestore_song_mapper.dart` — active-only payload |

**Tests ported (unit):** `test/domain/engine_test.dart`, `chord_layout_test.dart`, `session_navigation_test.dart` (subset of web inventory; `keyUtils`, `chordMarks`, `wrapLyricLine`, `graphemeUtils`, full `engine.test.ts` parity still expandable).

**Not in Phase B:** golden/widget chart tests (3H — manual QA + goldens TBD); expanded engine fixture suite.

---

## Phase B — Verified intentional diffs

| Topic | Flutter behavior |
|-------|------------------|
| Back / home | `/home` without `playlist` query; with playlist → `/playlists/{id}` (web uses `/` for home link) |
| Numbers mode | `displayChordLabel` uses **`originalKey`** for degrees (matches web `ChordRow.tsx`, not phase doc `currentKey` wording) |
| Recent song | `recordRecentSong` with **`originalKey`**, once per song id per session |
| Local guest songs | Not implemented |
| Share URL | `SharePlus` + hardcoded `https://lfchords.app` base in `song_screen.dart` — move to config / deep link in Phase 9 |
| Phase 4 chrome | No autoscroll, fullscreen, wake lock, bottom bar, swipe nav, theme cycle, AddToPlaylist |

---

## Phase B — Open parity risks

| Risk | Mitigation / status |
|------|---------------------|
| Indic lyric shaping vs web CSS | `google_fonts` (Noto Malayalam/Devanagari) on lyric rows — verify on device with tagged songs |
| `TextPainter` chord crowding vs DOM | `resolveChordLayout` + measure helper; one unit test for stack — expand fixtures if reports differ |
| Live stream errors | Same as web: ready without dedicated error panel |
| `session=` → `playlist=` canonical URL | Implemented in `SongScreen` init via `replace` when needed |
| Session position label in app bar | P1 optional — not wired |

---

## Phase B — Manual QA checklist

- [ ] Guest/signed-in: open active song from home; archived id → not found
- [ ] Transpose key modal; chords update; numbers toggle uses original-key degrees
- [ ] Pinch + control bar zoom; restart app — global zoom persisted
- [ ] Double-tap viewport 1 ↔ 1.5 scale
- [ ] Edit song in Firebase console — chart updates live
- [ ] `?playlist=&index=&key=` with readable session; back returns to playlist detail route
- [ ] Share sheet copies/opens `https://lfchords.app/song/{id}`
- [ ] Malayalam/Hindi sample if available in library

---

*Phase A report unchanged above; Phase B implementation as of 2025-09-22. Post–Bugbot fixes: inactive/`permission-denied` → not-found (`ready: true`), playlist back `/playlists/{id}`, zoom via scaled font + layout (no `Transform.scale`), wrap `maxChars` aligned with web, tag-based Noto Malayalam/Devanagari, target key re-sync on live `originalKey` / `?key=`. `flutter test` 60 tests passing.*

---

## Phase 4 boundary (do not port in Phase 3)

Components/hooks **present on** `song/[id]/page.tsx` that Phase 3 must **skip**:

| Item | Role on page | Citation |
|------|----------------|----------|
| `useAutoscroll` | Scroll animation, `AutoscrollBar`, hides control bar on mobile | `page.tsx:88`, `439-454`, `408` |
| `usePerformanceFullscreen` | Immersive fixed layout, `PerformanceFullscreen` | `page.tsx:89`, `368-381`, `507-517` |
| `useWakeLock` | Screen on during fullscreen/autoscroll | `page.tsx:90` |
| `PerformanceBottomBar` | Mobile footer: theme, set nav, zoom, key | `page.tsx:520-538` |
| `AutoscrollToggleButton` / fullscreen in `SongControlBar` | Desktop performance controls | `SongControlBar.tsx:213-225` |
| `handleToggleTheme` / `THEME_CYCLE` / `data-chart-theme` | Chart theme cycle | `page.tsx:50`, `280-287`, `486` |
| Swipe `onTouchStart`/`onTouchEnd` on `<main>` | Set navigation | `page.tsx:382-383`, `307-327` |
| `navigateSwipe` / prev/next in immersive chrome | Set navigation | `page.tsx:289-305`, `512-513` |
| `AddToPlaylistModal` | Playlist CRUD | `page.tsx:385-392`, `426` |
| Admin draft banner + version history | Admin only | `page.tsx:456-463`, `541-563` |
| `song-performance-page` body class | Performance styling | `page.tsx:115-127` |
| `useChartZoom` **behavior** when autoscroll disables gestures | Phase 3: gestures always on | `page.tsx:483` |

Phase 3 **may** port: `usePerformanceMode` **rule only** (wrap + layout width), `useChartZoom`, `useChartLayout`, `ChordChartViewport` pinch/double-tap, `SongHeader`, subset of `SongControlBar`, `KeySelectModal`, live song hook semantics, session read + URL parsers.

---

## Appendix: `getSong` read pattern

`getSong`: try `getDoc(ref)`; on throw, `getDocFromCache(ref)` (`songs.ts:79-96`). Comment says “server when online, cache fallback when offline” — first attempt uses default persistence (typically cache-then-server in Firebase SDK). Flutter should implement explicit cache-first + server fallback per Phase 2 index pattern.

---

## Appendix: Recent song on chart view

`recordRecentSong` uses **`song.originalKey`**, not transposed `targetKey` (`page.tsx:152-156`). Matches Phase 2 placeholder behavior intent.
