# Flutter Phase 4 — Performance mode & playlist navigation (on song screen)

**Parent:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 4  
**Parity specs:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.5, §3.4 (playlist nav, swipe) · route queries `playlist`, `index`, `key` (map §2.1)  
**Roadmap alignment:** Phase 4 user stories; matrix §3 — performance / autoscroll / wakelock (P0), zoom + chart theme (P0 with §3.5), playlist nav query (UI completion)  
**Depends on:** [Phase 3](flutter-phase-3-song-chart.md) (`SongScreen`, chart scroll container, zoom, `sessionSongs` load, `sessionNavigation` parsers)  
**Backend:** No new Firestore writes — prefs on device only (`shared_preferences`)

**Goal:** **Stage-ready** song experience on mobile: autoscroll with web speed curve, screen stays on during performance, immersive layout, chart theme cycle, **prev/next** through a set when `?playlist=` + `index=`, swipe between songs — matching web `song/[id]/page.tsx` performance UX.

**Estimate:** 2 person-weeks (1 FTE)

---

## 1. Scope summary

### In scope (Phase 4)

| Area | Web reference | Flutter deliverable |
|------|---------------|---------------------|
| Performance mode flag | `usePerformanceMode` | `performanceMode` = phone layout **or** `playlist` query non-null |
| Autoscroll | `useAutoscroll`, `autoscrollSpeed.ts` | `requestAnimationFrame` / `Ticker` loop on chart `ScrollController` |
| Autoscroll UI | `AutoscrollBar` | Speed +/-, pause/resume, close |
| Wake lock | `useWakeLock` | **`wakelock_plus`** while autoscroll **or** immersive fullscreen |
| Immersive layout | `immersive = autoscroll \|\| fullscreen` | Full-screen overlay; hide header/control bar when immersive |
| Fullscreen | `usePerformanceFullscreen` | **P1 native** `SystemChrome` immersive sticky; **P0** in-app pseudo-fullscreen (match web fallback) |
| Performance bottom bar | `PerformanceBottomBar` | Fixed bottom: prev/next, key, zoom, theme, autoscroll, fullscreen |
| Playlist prev/next | `buildAdjacentSongHref`, `sessionSongHref` | `go_router` push/replace with updated `index` + `key` |
| Swipe between songs | `onTouchStart` / `onTouchEnd`, 72px threshold | `GestureDetector` horizontal drag when `playlist` + `index` set |
| Chart theme | `ChartTheme` cycle, `data-chart-theme` | `system` / `dark` / `stage` on chart subtree |
| Theme persistence | `writeChartTheme` / `readChartTheme` | `shared_preferences` key **`lf-theme`** (web parity — see §4.1 conflict note) |
| Session zoom persist | `writeSessionZoom` | Already Phase 3; verify persists when changing songs in set |
| Session index persist | `writeLastSessionIndex` | When navigating songs in set |
| Body / page classes | `song-performance-page`, `song-autoscroll-active` | Theme extensions / `Theme` wrapper on song route |
| Control bar integration | `SongControlBar` + bottom bar | **Mobile (&lt;768):** `PerformanceBottomBar` when not autoscroll/fullscreen. **Tablet/desktop:** keep `SongControlBar` with autoscroll + fullscreen toggles (Phase 3 stub → wire in 4) |
| Pinch during autoscroll | `gesturesEnabled={!autoscroll.active}` | Disable pinch zoom while autoscroll active (double-tap preset unchanged on web) |
| Session chrome | `session?.title`, `sessionBackHref` | Playlist title + link to `/playlists/{id}` in bottom bar when session loads |
| Transpose flash | `transposeFlash` on bars | Brief key flash (~900ms) on transpose; bottom bar shows flash key like web |
| `startSetHref` | `sessionNavigation.ts` | Port with adjacent helpers (used from playlist “start set” in Phase 5) |
| Chart zoom constants | `CHART_SCALE_*` in `performancePreferences` | Already Phase 3 — bottom bar reuses same `zoomIn` / `zoomOut` |

### Out of scope (Phase 4)

| Item | Phase |
|------|--------|
| Playlists list / create / edit UI | **5** |
| Join API, share playlist modal | **5** |
| Offline prefetch set | **6** |
| Groups | **7** |
| Admin / song edit | Never |
| Web Fullscreen API on desktop browsers | N/A on Flutter — use mobile immersive APIs |

### Mobile vs web (intentional)

| Topic | Web | Flutter Phase 4 |
|-------|-----|------------------|
| Performance bottom bar | `isMobile` only (`useIsMobile`, &lt;768) | Shown when `isMobile && !autoscroll.active && !fullscreen.active` — **not** when `performanceMode` alone (e.g. tablet + `?playlist=` uses top bar) |
| Wake lock | `navigator.wakeLock` | `wakelock_plus` |
| Fullscreen | `document.requestFullscreen` | `SystemUiMode.immersiveSticky` + optional `SystemChrome` |
| Prev/next | `<Link href={prevHref}>` | `context.go(sessionSongHref(...))` preserving playlist query |
| Home / playlist back | `/` and `/playlists/{id}` | `/home` and `/playlists/{id}` |

---

## 2. Web behavior checklist (must match)

Sources: `song/[id]/page.tsx`, hooks under `lib/hooks/useAutoscroll.ts`, etc.

**Map errata:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.5 lists client keys `lf-chart-zoom` / `lf-chart-theme`; **source of truth** is `performancePreferences.ts`: `lf-zoom-level`, `lf-theme`, `lf-session-{id}-zoom`, `lf-session-{id}-last-index`. (`lf-view-mode` is editor-only — not used on song page; **out of scope**.)

### 2.0 Two flags: `performanceMode` vs `isMobile`

| Flag | Rule | Drives on web |
|------|------|----------------|
| `usePerformanceMode(sessionId)` | width &lt; **768** **or** `playlist` query set | `wrapEnabled`, `useChartLayout`, `song-performance-page` body class, compact header |
| `useIsMobile()` | width &lt; **768** only | `PerformanceBottomBar`, hide `SongControlBar` during mobile autoscroll, extra bottom padding (`pb-28`) |

Flutter must keep both signals — do not use a single “performance” boolean for layout **and** bottom chrome.

### 2.1 `usePerformanceMode`

```text
performanceMode = viewport width < 768 OR sessionId (playlist query) != null
```

Flutter:

- `shortestSide` / width breakpoint **768** OR non-null `playlist` route param.
- When true: apply `song-performance-page` styling (padding, compact header — Phase 3 header already compact on phone).
- Drives **`wrapEnabled`** on chart lines (Phase 3) — ensure still true when performance mode flips on.

### 2.2 Autoscroll engine

Port **`autoscrollSpeed.ts`** exactly:

| Constant | Value |
|----------|--------|
| `AUTOSCROLL_MIN_SPEED` | 0.1 |
| `AUTOSCROLL_MAX_SPEED` | 2 |
| `AUTOSCROLL_DEFAULT_DESKTOP` | 0.7 |
| `AUTOSCROLL_DEFAULT_TOUCH` | 0.4 |
| `AUTOSCROLL_TOUCH_RATE_MULTIPLIER` | 0.85 |
| `AUTOSCROLL_BASE_PX_PER_SEC` | 20 |
| Speed step | 0.05 if speed &lt; 1, else 0.1 |

- **Pixels/sec** = `BASE * speed * (touch ? 0.85 : 1)`.
- **Touch detect:** `detectTouchAutoscrollDevice()` logic (coarse pointer / max-width 1024 / touch points).
- **Loop:** `requestAnimationFrame`; delta time × px/sec → increment scroll offset.
- **Scroll guard:** only apply delta when `scrollHeight - clientHeight > 4` (web `scrollContainerBy`).
- **On start:** reset speed to default for device; `active=true`, `paused=false`.
- **On stop:** `active=false`, cancel ticker.
- **Pause / resume:** pause stops advancing time; resume clears `lastTime` (web `lastTimeRef = null`).
- **On activate:** if document root scrolled, transfer `scrollTop` to chart container (web) — Flutter: single primary `ScrollController` on chart list.
- **While active:** `document.body.style.overflow = hidden` — Flutter: lock outer scroll / `NeverScrollableScrollPhysics` on ancestors.
- **Port:** `clampAutoscrollSpeed` re-exported from hook module on web — expose from `autoscroll_speed.dart` if tests need it.

### 2.3 Wake lock

```text
wakeLock.enabled = fullscreen.active OR autoscroll.active
```

- Request on enable; release on disable.
- Re-acquire on `visibilitychange` visible (web) — Flutter: `AppLifecycleState.resumed` retry.

### 2.4 Fullscreen / immersive (chrome visibility — match web exactly)

`define immersive = autoscroll.active || fullscreen.active`

| UI | Autoscroll only | Fullscreen only |
|----|-----------------|-----------------|
| Main layout | `fixed inset-0` / `100dvh`, `z-[60]` when immersive | Same |
| `SongHeader` | **Still shown** (`!fullscreen.active`) | **Hidden** |
| `SongControlBar` | Hidden when `isMobile && autoscroll.active` | **Hidden** |
| Chart scroll area | `overflow-y-auto`, extra `pb-24` while autoscroll or fullscreen | Same |
| Bottom padding (non-immersive mobile) | `pb-28` when bottom bar visible | — |

- **Fullscreen toggle:** set `active=true`, then try native Fullscreen API; on failure keep **pseudo-fullscreen** (`active` still true). Class `song-fullscreen-active` on root while active.
- **Exit:** user or OS exits native fullscreen → `active=false` (`fullscreenchange` listener on web).
- **Flutter:** `SystemUiMode.immersiveSticky` when fullscreen active; pseudo-fullscreen = same fixed layout without requiring OS immersive.
- **`PerformanceFullscreen`** overlay (fullscreen only): exit (top-right), **next song only** (no prev), zoom +/- , `sessionPosition`, wake-lock unsupported hint (`Screen may dim…`).

### 2.5 Autoscroll bar

Shown when `autoscroll.active` — fixed bottom (above safe area):

- Close → `autoscroll.stop()`
- Slower / faster → `decreaseAutoscrollSpeed` / `increaseAutoscrollSpeed`
- Display `formatAutoscrollSpeed(speed)x`
- Pause / resume toggle

Hide `SongControlBar` on mobile when autoscroll active (web).

### 2.6 Performance bottom bar

When **`isMobile && !autoscroll.active && !fullscreen.active`** (web):

- Session label (`session?.title`) with optional link via `sessionBackHref` (`/playlists/{sessionId}`) + `sessionPosition` (`3/12`)
- Prev / next when `buildAdjacentSongHref` returns href; disabled styling when null
- Key button → `KeySelectModal`; display `transposeFlash ?? targetKey`
- `ChartZoomButtons` (bar variant)
- Theme toggle — cycle `system` → `dark` → `stage`; aria label `Theme: Auto|Dark|Stage`
- `AutoscrollToggleButton` + `FullscreenToggleButton`

When playlist context missing: prev/next row omitted; center cluster still shows key/zoom/theme/autoscroll/fullscreen.

**Tablet/desktop (`!isMobile`):** autoscroll + fullscreen via **`SongControlBar`**; **no** chart theme button on web control bar. Set navigation: **swipe on main** still works; prev/next links only in bottom bar (mobile). Tablet in set: swipe + optional P1 add prev/next to control bar.

### 2.7 Playlist navigation

1. **`parseSessionNavParams`:** `playlist` or legacy `session`, `index` int ≥ 0 (invalid index → `index: null` but keep `sessionId`).
2. **`canonicalPlaylistSearchParams`:** Phase 3 — rewrite `session=` → `playlist=` on song route.
3. **Session data (Phase 3 repo):** `getSession` + `listSessionSongs` ordered by **`order` asc** (same as `sessionSongs.ts` query). Failures → empty session; chart still works.
4. **`buildAdjacentSongHref` / `sessionSongHref`:** `/song/{songId}?playlist=…&index=…` + `key=` when `entry.keyOverride` set.
5. **`startSetHref`:** first song index 0 — port for Phase 5 playlist detail.
6. **Navigate:** web uses `router.push` for swipe and `<Link>` for bar — Flutter `context.push` or `go` per product back-stack; **reset chart scroll to top** on song id change.
7. **`writeLastSessionIndex`:** when session loads with valid `sessionIndex` **and** on each navigation index change.
8. **Swipe:** on main touch handlers; delta ≥ **72** px → prev (swipe right) / next (swipe left); requires `sessionId` + `sessionIndex`; same threshold as web.
9. **URL `key` param:** initial `targetKey` when valid `Key` (Phase 3); preserved across `sessionSongHref` when overriding.

### 2.8 Chart theme

- Cycle: `["system", "dark", "stage"]` (web `THEME_CYCLE`).
- `writeChartTheme` on change; `resolveChartTheme(sessionId)` reads stored only (**sessionId ignored** on web).
- Apply to chart subtree (`data-chart-theme`). Port CSS variables from `globals.css`:
  - **system:** light defaults; follow app dark / `prefers-color-scheme` for chord/lyric/section tokens.
  - **dark:** chord `#6b9aff`, lyric `#c8c8c8`, section bg `#1a1a1a`.
  - **stage:** black chart bg, chord `#ffff66`, lyric white, padded rounded container.
- Chart theme toggle is **only** on `PerformanceBottomBar` (mobile). `SongControlBar` has **no** theme cycle on web — tablet/desktop users change chart theme only when width &lt;768 bottom bar shows, or add **P1** theme control to control bar on Flutter for parity gap (optional; not required for roadmap P0).

### 2.9 Zoom + session prefs (roadmap story 5)

- Session zoom already in Phase 3 — confirm **persist** when switching songs via prev/next (`sessionId` unchanged).
- Global zoom unchanged unless user adjusts.

### 2.10 Gestures & conflicts

- Pinch zoom on `ChordChartViewport`: **off** while autoscroll active.
- Swipe nav: attached to **main** song scaffold (web `onTouchStart`/`onTouchEnd` on `<main>`); 72px minimum horizontal delta; no vertical-angle guard on web — Flutter may add slop but must not require stricter than web without reason.

### 2.11 Accessibility (map §3 — P1, include in 4G)

Mirror web `aria-label`s: close autoscroll, slower/faster, pause/resume, key button (`Key {n}. Tap to choose key.`), prev/next song, theme, exit fullscreen, zoom. Use `Semantics` on icon buttons in bars.

---

## 3. Local prefs (shared_preferences)

| Key | Web | Phase |
|-----|-----|--------|
| `lf-zoom-level` | global chart zoom | 3 |
| `lf-session-{id}-zoom` | per-set zoom | 3 |
| `lf-theme` | chart theme **and** app theme on web | 1 app + **4 chart** — see risk |
| `lf-session-{id}-last-index` | last song index in set | 3/4 |

### 3.1 `lf-theme` conflict (web parity)

Web uses **`lf-theme`** for both `theme.ts` (light/dark app) and `performancePreferences` chart theme (`system`/`dark`/`stage`). Values overlap on `"dark"`.

**Flutter recommendation:**

- **App profile theme (Phase 1):** keep `light` / `dark` in `lf-theme` OR migrate to `lf-app-theme` if chart clobbering is observed.
- **Chart theme (Phase 4):** port web keys first; if clash breaks profile, split chart to **`lf-chart-theme`** and document intentional Flutter fix.

---

## 4. Dependencies (`pubspec.yaml`)

```yaml
dependencies:
  wakelock_plus: ^1.2.0    # roadmap Phase 4; screen on during performance
```

No new Firebase packages.

---

## 5. Architecture (Flutter)

### 5.1 Folder layout

```
mobile/lib/
  domain/
    autoscroll_speed.dart          # port autoscrollSpeed.ts
    session_navigation.dart        # extend Phase 3 (nav helpers)
    performance_preferences.dart   # extend: chart theme read/write
  features/performance/
    autoscroll_controller.dart     # port useAutoscroll
    wake_lock_controller.dart      # wakelock_plus wrapper
    fullscreen_controller.dart     # SystemChrome + state
    performance_mode.dart          # breakpoint + playlist query
  features/song/widgets/
    autoscroll_bar.dart
    performance_bottom_bar.dart
    performance_fullscreen_overlay.dart
    chart_theme.dart               # system/dark/stage colors
  features/song/
    song_screen.dart               # wire Phase 4 into existing screen
```

### 5.2 Riverpod (sketch)

| Provider | Role |
|----------|------|
| `performanceModeProvider` | bool from width + playlist |
| `autoscrollProvider` | active, paused, speed, start/stop/... |
| `wakeLockProvider` | derived from autoscroll ∨ fullscreen |
| `fullscreenProvider` | immersive state |
| `chartThemeProvider` | ChartTheme + cycle |
| `playlistNavProvider` | prev/next hrefs or indices from sessionSongs |

### 5.3 Routing

No new routes — same `/song/:id` with query params. Navigation uses:

```dart
context.go('/song/${entry.songId}?playlist=$id&index=$nextIndex&key=$key');
```

Use `sessionSongHref` builder from domain layer (port tests from `sessionNavigation.test.ts`).

---

## 6. Sub-phases (implementation order)

### Phase 4A — Domain ports (1–2 days)

- [ ] `autoscroll_speed.dart` + tests from `autoscrollSpeed.test.ts`.
- [ ] Complete `performance_preferences.dart` chart theme + last index (if not done in Phase 3).
- [ ] `session_navigation.dart` href builders + tests.

### Phase 4B — Autoscroll controller (2–3 days)

- [ ] ScrollController integration; rAF/ticker loop; pause/resume; overflow lock.
- [ ] Touch device detection.

### Phase 4C — Wake lock & fullscreen (1–2 days)

- [ ] `wakelock_plus` enable/disable tied to §2.3.
- [ ] Immersive UI mode + pseudo-fullscreen overlay.

### Phase 4D — UI bars (2–3 days)

- [ ] `AutoscrollBar`, `PerformanceBottomBar`, `PerformanceFullscreen` overlay.
- [ ] Wire autoscroll/fullscreen on **`SongControlBar`** for `!isMobile`.
- [ ] Hide/show header and control bar per §2.4 table (do not hide header during autoscroll-only).
- [ ] Mobile bottom inset padding when bar visible (`pb-28` equivalent + safe area).

### Phase 4E — Playlist nav + swipe (2 days)

- [ ] Prev/next buttons; `go_router` navigation with correct query.
- [ ] Horizontal swipe 72px threshold.

### Phase 4F — Chart theme (1–2 days)

- [ ] Theme cycle UI; apply colors to chart; persist `lf-theme` / split key if needed.

### Phase 4G — QA (1–2 days)

- [ ] Run 3-song set: prev/next, swipe, autoscroll 5 min, screen stays on.
- [ ] Low-end Android scroll jank tuning.

---

## 7. Testing plan

| Layer | What |
|-------|------|
| Unit | `autoscroll_speed` clamp/step/px/sec; `session_navigation` adjacent hrefs |
| Unit | `formatAutoscrollSpeed`, touch multiplier |
| Widget | AutoscrollBar tap pause; bottom bar disabled prev on first song |
| Manual | Playlist with 3+ songs; autoscroll + wakelock; theme cycle visible on chart |
| Manual | Leave app and return — wake lock re-acquire |

**Web tests to port:** `useAutoscroll.test.ts`, `autoscrollSpeed.test.ts`, `performancePreferences.test.ts`, `useWakeLock.test.ts`, `usePerformanceFullscreen.test.ts`, `performanceControls.test.ts`, `sessionNavigation.test.ts`.

---

## 8. Definition of done (Phase 4)

- [ ] From `?playlist=&index=`, bottom bar shows prev/next and position when session loads.
- [ ] Swipe and buttons navigate with correct `index` and optional `key` query.
- [ ] Autoscroll speed curve matches web constants (unit tests).
- [ ] Screen stays on during autoscroll or immersive mode (`wakelock_plus`).
- [ ] Immersive mode hides chrome; autoscroll bar controls work.
- [ ] Chart theme cycles system / dark / stage and applies to chart.
- [ ] Session zoom persists across songs in same playlist.
- [ ] Pinch zoom disabled during autoscroll.
- [ ] Tablet + playlist: `SongControlBar` autoscroll/fullscreen work; phone uses bottom bar per §2.0.
- [ ] Fullscreen overlay: next-only, exit, zoom; wake-lock unsupported copy when applicable.
- [ ] `writeLastSessionIndex` on session load + nav; session title in bottom bar when `getSession` succeeds.
- [ ] Roadmap Phase 4 marked complete.

---

## 9. Roadmap & matrix traceability

| Roadmap story | Section |
|---------------|---------|
| Playlist context bottom bar prev/next | §2.6, §2.7, 4E |
| Autoscroll speed curve | §2.2, 4B |
| Screen stays on | §2.3, 4C |
| System UI hidden in performance | §2.4, 4C |
| Persist zoom per session | §2.9 |
| Matrix: performance / autoscroll / wakelock P0 | §1 |
| Matrix: playlist nav query P0 (UI) | §2.7 |
| Matrix: zoom + chart theme P0 | §2.8–2.9 |

---

## 10. Web file → Flutter port map

| Web file | Flutter target |
|----------|----------------|
| `lib/autoscrollSpeed.ts` | `autoscroll_speed.dart` |
| `hooks/useAutoscroll.ts` | `autoscroll_controller.dart` |
| `hooks/useWakeLock.ts` | `wake_lock_controller.dart` |
| `hooks/usePerformanceFullscreen.ts` | `fullscreen_controller.dart` |
| `hooks/usePerformanceMode.ts` | `performance_mode.dart` |
| `lib/performancePreferences.ts` | chart theme + session index (extend) |
| `lib/sessionNavigation.ts` | `session_navigation.dart` (`sessionSongHref`, `startSetHref`, `canonicalPlaylistSearchParams`, adjacent hrefs) |
| `components/AutoscrollBar.tsx` | `autoscroll_bar.dart` |
| `components/PerformanceBottomBar.tsx` | `performance_bottom_bar.dart` |
| `components/PerformanceFullscreen.tsx` | `performance_fullscreen_overlay.dart` |
| `components/AutoscrollToggleButton.tsx` | part of bars |
| `components/FullscreenToggleButton.tsx` | part of bars |
| `app/globals.css` (chart theme vars) | `chart_theme.dart` |
| `song/[id]/page.tsx` (performance wiring) | `song_screen.dart` |

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Autoscroll jank on low-end Android | Single scroll view; throttle; profile with DevTools |
| `lf-theme` app vs chart clash | §3.1 split key if needed |
| Wake lock denied by OS | Show subtle hint; still allow autoscroll |
| iOS immersive / safe area | `SafeArea` on bars; test notched devices |
| Navigate set without Phase 5 playlist UI | Deep link / manual `?playlist=` URLs; Phase 3 loads `sessionSongs` |
| Session Firestore read denied | Prev/next hidden; chart still works |
| Confusing `performanceMode` vs `isMobile` | Document §2.0 in code comments on `SongScreen` |
| Wrong immersive chrome (header hidden during autoscroll) | Follow §2.4 table — common port bug |

---

## 12. What comes next (not Phase 4 gaps)

| Web map | Phase |
|---------|--------|
| §3.6 Playlists CRUD, share, join | 5 |
| §3.6 offline cache | 6 |
| §3.7 Groups | 7 |
| Add to playlist from song | 5 |

---

## 13. After Phase 4

- **Phase 5:** [`flutter-phase-5-playlists.md`](flutter-phase-5-playlists.md) — playlist list/detail, session songs CRUD, invite join API.
- **Phase 3 doc:** Performance items marked done when this phase ships.

---

*End of Phase 4 plan.*
