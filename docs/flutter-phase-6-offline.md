# Flutter Phase 6 — Offline set download & connectivity UX

**Parent:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 6  
**Parity specs:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.6 (offline cache), §3.12 (banner + probe), data §4.5–4.6  
**Roadmap alignment:** Matrix §3 — offline prefetch set (P0), connectivity banner (P1); local-first principles in roadmap §0  
**Depends on:** [Phase 2](flutter-phase-2-library.md) (index load + Firestore persistence plan), [Phase 3](flutter-phase-3-song-chart.md) (live song stream + `getSong` cache fallback), [Phase 5](flutter-phase-5-playlists.md) (playlist detail UI — enable cache button)  
**Backend:** Same Firestore project; **no** new collections. HTTP **`GET {JOIN_API_BASE_URL}/connectivity.txt`** (web probe; body `ok`, status 200).

**Map note:** §3.12 also covers service worker shell cache (`sw.js`) — **Flutter N/A**. Probe parity matters: on web, SW **bypasses** cache for `/connectivity.txt` (`network-only`); mobile must use a **non-cached** HTTP client request to the Vercel host (not a local asset).

**Goal:** Sunday-ready **offline sets**: user explicitly **downloads a playlist** (session + song bodies into Firestore disk cache), sees a clear **offline banner** when the network is unreachable, and can still open **cached charts** and **prefetched playlist metadata** — matching web `cacheSessionOffline` + `OfflineBanner` behavior (without PWA/service worker).

**Estimate:** 1.5–2 person-weeks (1 FTE)

---

## 1. Scope summary

### In scope (Phase 6)

| Area | Web reference | Flutter deliverable |
|------|---------------|---------------------|
| Firestore persistence | `firebase.ts` `persistentLocalCache` | Enable on mobile at init (Phase 1–2 prerequisite); default SDK disk cache |
| Download set | `cacheSessionOffline`, playlist detail button | `SessionRepository.cacheSessionOffline(sessionId)` + UI on `playlist_detail_screen` |
| Prefetch semantics | `getDocFromServer` session + each `songs/{id}` | `GetOptions(source: Source.server)` (or equivalent) for session doc and song docs |
| Session songs query cache | `listSessionSongs` inside `cacheSessionOffline` | **Critical:** while online, run ordered `sessionSongs` query so results live in Firestore disk cache (required for set list + `?playlist=` offline). Flutter: prefer **`getDocs` with `Source.server`** when online during prefetch (web uses default `getDocs` while online — strengthen if SDK allows) |
| Prefetch progress | Web `busy` only | **P1:** determinate progress (`3/12 songs`) for large sets; minimum: loading state on button |
| Success UX | `handleCacheOffline` message | Snackbar: “Playlist cached for offline use.” (web `actionMessage`) |
| In-progress UX | `busy` on detail actions | Disable cache button + show progress while prefetch runs |
| Online status | `useOnlineStatus.ts` | Riverpod `onlineStatusProvider` — probe + debounce + poll |
| Connectivity probe | `GET /connectivity.txt`, `cache: no-store` | `http` **GET** (match web), no HTTP cache headers; URL `{JOIN_API_BASE_URL}/connectivity.txt` |
| Probe constants | `useOnlineStatus.ts` | `OFFLINE_DEBOUNCE_MS` 2000, `POLL_MS` 30000, `PROBE_TIMEOUT_MS` 5000 |
| Offline banner | `OfflineBanner.tsx` | Sticky top banner in app shell; `role="status"` / `Semantics` |
| Banner copy | Web exact string | “You're offline. Cached songs and sessions may still be available.” |
| Events | `online`, `offline`, `focus` | `connectivity_plus` + `WidgetsBindingObserver` (app resume) to re-probe |
| Song read fallback | `songs.getSong` | `get` → on failure `get(GetOptions(source: Source.cache))` in `SongRepository` |
| Live song offline | `useSongLive` + persistence | `snapshots()` serves cached doc when offline after prefetch/view |
| Index offline | Phase 2 | After first index load, chunk docs readable from Firestore cache (no new “download library” button in v1) |
| Shell placement | `ClientProviders` in root `layout.tsx` | Banner on **all** routes (login, join, app) — wrap root `MaterialApp` child stack, not only authenticated tabs |
| `CONNECTIVITY_PROBE_URL` constant | `useOnlineStatus.ts` export | Port name in `connectivity_probe.dart` for tests |

### Out of scope (Phase 6)

| Item | Phase / note |
|------|----------------|
| Service worker / `sw.js` shell cache | Web PWA only (map §3.12) |
| Guest `localStorage` songs | Never |
| Full library bulk download (all songs / all index) | Out of v1 — **set download only** |
| Background sync / WorkManager queue | P2; v1 = foreground download on user tap |
| Offline playlist **list** merge queries | Requires network; show cached detail only for **downloaded** sets |
| Offline join API / share / CRUD writes | Fail with clear error when offline |
| `songIndex` server rebuild / admin | Never |
| Persist “downloaded playlist ids” registry | **P1 optional** `shared_preferences` for UI badge (web relies on implicit Firestore cache only) |

### Mobile vs web (intentional)

| Topic | Web | Flutter Phase 6 |
|-------|-----|------------------|
| Online detection | `fetch('/connectivity.txt')` not cached by SW | HTTP probe to Vercel host (same file) |
| Native “connected” flag | `online`/`offline` events re-run **probe** | `connectivity_plus` triggers re-probe; **banner tracks probe**, not radio alone |
| Cache button | Icon in playlist detail header | Same placement (Phase 5 hid it — **enable** in 6) |
| Multi-tab cache | `persistentMultipleTabManager` | Single app process — default persistence sufficient |

---

## 2. Web behavior checklist (must match)

Sources: `sessions.cacheSessionOffline`, `useOnlineStatus.ts`, `OfflineBanner.tsx`, `songs.getSong`, map §3.12.

### 2.1 Foundation: Firestore offline persistence

- Web: `initializeFirestore` with `persistentLocalCache` (not memory in production).
- Flutter: enable persistence when `cloud_firestore` lands ([Phase 1](flutter-phase-1-auth.md) / roadmap Phase 0 step 9). On Android/iOS persistence is **on by default**; Phase 6A **verifies** reads survive airplane mode.
- **Implication:** Any prior `get` / `snapshots` on `songIndex`, `sessions`, `songs`, `sessionSongs` queries may already be on disk; Phase 6 adds **explicit server pull** for a full set.

### 2.2 `cacheSessionOffline(sessionId)`

```text
1. getDocFromServer(sessions/{sessionId})
2. entries = listSessionSongs(sessionId)   // getDocs ordered by order
3. Promise.all(entries.map(e => getDocFromServer(songs/{e.songId})))
```

- Does **not** call join API or index rebuild.
- Does **not** prefetch each `sessionSongs/{entryId}` doc via `getDocFromServer` on web — relies on step 2 **query** populating the persistence layer + step 3 song bodies.
- **Offline set list depends on step 2:** if only song docs were cached but the query never ran, `sessionSongs` snapshot/list may be empty offline. QA must confirm ordered query ran during download.
- **Failure mode:** `Promise.all` on songs — one failed `getDocFromServer` fails entire download (surface error; no partial success flag on web).
- Errors: propagate to UI (`runAction` → generic “Action failed.” or exception message).
- Requires **network** at tap time; if offline, disable or fail with “Connect to download this set.”
- **Active songs only:** prefetched `songs` docs may include non-active; chart stream still filters `status == 'active'` (Phase 3) — archived entries may show in list but not chart.

### 2.3 Playlist detail UI

- Control: download/cache icon in action row (`aria-label` / `title` “Cache for offline” on web) — Phase 5 must **show** this control (not hidden).
- Shown whenever `canView` (owner, shared, or published) — not owner-only.
- Disabled while `busy` (same as other detail actions).
- On success: inline `actionMessage`: **“Playlist cached for offline use.”** (exact web string).

### 2.4 `probeConnectivity()`

- `fetch(CONNECTIVITY_PROBE_URL, { cache: 'no-store', signal })` with **5s** timeout.
- Returns `response.ok` (file content is `ok` — status 200 sufficient).
- `CONNECTIVITY_PROBE_URL` = `/connectivity.txt` on web origin → Flutter: `{JOIN_API_BASE_URL}/connectivity.txt`.

### 2.5 `useOnlineStatus` state machine

- Initial check on mount.
- On probe success → `online = true` immediately (clear debounce timer).
- On probe failure → start **2s** timer; if still failing, `online = false`.
- Re-check on: `window` `online`/`offline` (events trigger **probe**, not immediate flip), `focus`, and every **30s** interval.
- **Initial state:** `online = true` until first failed probe completes debounce (banner may lag up to ~2s after disconnect — match web).
- Return value drives banner visibility only — does **not** block Firestore reads or disable offline cache access.

### 2.6 `OfflineBanner`

- Render when `!online`.
- Sticky top, high z-index, amber styling (match web intent).
- `role="status"` for accessibility.
- No dismiss button on web — banner hides when probe succeeds.

### 2.7 Song loading while offline

**`getSong` (one-shot)** — map §3.12 “getDoc falls back to cache”:

1. Try normal `getDoc` (cache-then-network when persistence on).
2. On **error**, `getDocFromCache`; return if exists.

**`watchSong` / live stream (Phase 3):**

- `snapshots()` emits cached metadata when offline after prefetch/view; merges when online.
- Never cached / non-active: empty chart or not-found UX (no `localStorage` fallback).

### 2.8 What works offline (v1 expectations)

| Feature | Offline after prefetch / prior view |
|---------|-------------------------------------|
| Open song chart (downloaded or previously opened) | Yes |
| Run set via `?playlist=` if session + songs cached | Yes (Phase 4 nav local) |
| Search home index | Yes if index chunks were loaded while online |
| List all playlists (`listPlaylistsForUser`) | **No** (needs network) |
| Join playlist / share / edit set | **No** |
| Live admin chart updates | Paused until online |
| Recent songs / zoom / theme prefs | Yes (`shared_preferences` — local only) |
| Open playlist detail (downloaded) | Yes — `getSession` + `sessionSongs` from cache |
| TanStack / Riverpod refresh from network | Fails silently or shows stale cache |

### 2.9 Index + search (Phase 2 carryover)

- Web `loadSongIndexChunks`: **cache-first** `getDoc`, on error `getDocFromServer` when online (`songIndex.ts`).
- Phase 2 progressive load + in-memory Riverpod cache; Phase 6 QA: airplane mode after first full index load — home browse/search/filter runs **on-device** with no network.
- Index is **not** part of `cacheSessionOffline` — users must open library once online (or ship P2 “download library” separately).

### 2.10 Playlist detail offline (after download)

- Re-open `/playlists/:id`: `getSession(sessionId)` reads from disk cache.
- `sessionSongs` stream/list: served from cached query if step 2 ran during download.
- Edit/share/publish/delete: Firestore writes fail offline — show error; read-only viewing OK.

---

## 3. Configuration

| Define | Purpose |
|--------|---------|
| `JOIN_API_BASE_URL` | Join API **and** `connectivity.txt` host (default `https://lfchords.vercel.app`) |
| Optional `CONNECTIVITY_PROBE_URL` | Full URL override if probe moves off Vercel root |

---

## 4. Dependencies (`pubspec.yaml`)

```yaml
dependencies:
  connectivity_plus: ^6.0.0   # roadmap Appendix A; radio + listeners
  http: ^1.2.0                # connectivity probe (may already be Phase 5)
```

`cloud_firestore` persistence — no extra package.

---

## 5. Architecture (Flutter)

### 5.1 Folder layout

```
mobile/lib/
  core/
    connectivity/
      connectivity_probe.dart      # port probeConnectivity + constants
      online_status_provider.dart  # port useOnlineStatus logic
    widgets/offline_banner.dart
  data/
    session_repository.dart        # + cacheSessionOffline
    song_repository.dart           # + getSong cache fallback (if not Phase 3)
  features/playlists/
    playlist_detail_screen.dart    # wire cache button + progress
```

### 5.2 Riverpod (sketch)

| Provider | Role |
|----------|------|
| `onlineStatusProvider` | `bool` online |
| `cacheSessionOfflineProvider` | `Future<void>` family by `sessionId` + loading state |
| Optional `downloadedPlaylistsProvider` | P1: prefs set of session ids for badges |

### 5.3 UI integration

- Place `OfflineBanner` at **root** (sibling to router child), matching web `ClientProviders` (root `layout.tsx` — includes login/join).
- Layout pattern: `Column` with banner + `Expanded(child: router)`; banner `SafeArea` top inset.
- Sticky top (`z-index` high) so it remains visible while scrolling charts.

---

## 6. Sub-phases (implementation order)

### Phase 6A — Persistence audit (1–2 days)

- [ ] Confirm Firestore persistence enabled at startup.
- [ ] Document in `mobile/README.md` offline behavior + defines.
- [ ] Manual: load song online → airplane mode → reopen song.

### Phase 6B — `cacheSessionOffline` (2–3 days)

- [ ] Port repository method; server fetch session + songs.
- [ ] Unit test with fake Firestore or emulator optional.
- [ ] Wire playlist detail button; exact success string; fail fast on offline tap.
- [ ] Server-source `sessionSongs` query during prefetch when API supports it.

### Phase 6C — `getSong` cache fallback (1 day)

- [ ] Align `SongRepository` with web try/cache pattern if not done in Phase 3.

### Phase 6D — Connectivity probe + provider (2–3 days)

- [ ] `connectivity_probe.dart` + tests for debounce timing (inject clock).
- [ ] `onlineStatusProvider` with poll + resume + connectivity_plus.

### Phase 6E — Offline banner (1 day)

- [ ] `offline_banner.dart` in shell; semantics + theme (amber).

### Phase 6F — QA pass (2–3 days)

- [ ] Download 5-song set → airplane mode → start set → scroll charts → autoscroll optional.
- [ ] Banner appears within ~2s of losing network; clears when back online.
- [ ] Probe uses Vercel URL in release build.
- [ ] Large set (20+ songs): progress UI, no ANR (chunk parallel fetches with reasonable concurrency if needed).

---

## 7. Testing plan

| Layer | What |
|-------|------|
| Unit | `probeConnectivity` timeout; debounce: fail→wait 2s→offline; success clears timer |
| Unit | `cacheSessionOffline` calls server source for N songs (mock repo) |
| Widget | Banner visible when provider false |
| Manual | Roadmap demo: airplane after download → set still works |
| Manual | Phase 2 index browse offline after prior session |

**Web tests to mirror:** logic in `useOnlineStatus` (no dedicated test file — port behavior spec); integration around `cacheSessionOffline` in `sessions.integration.test.ts` if present.

---

## 8. Definition of done (Phase 6)

- [ ] User can tap download on playlist detail while online; success message shown.
- [ ] After download, airplane mode: playlist detail readable from cache; songs in set open in chart.
- [ ] `?playlist=` navigation works offline for downloaded set (Phase 4).
- [ ] Offline banner shows with correct copy when probe fails (debounced).
- [ ] Banner hides when connectivity returns.
- [ ] `getSong` / live stream serves cached active songs when offline.
- [ ] Home library usable offline after index was loaded once online (Phase 2 regression).
- [ ] Offline banner on login route when probe fails (root placement).
- [ ] Download fails entirely if any song doc fetch fails (match web).
- [ ] Set list rows + session metadata visible offline after successful download.
- [ ] Roadmap Phase 6 marked complete.

---

## 9. Roadmap & matrix traceability

| Roadmap / matrix item | Section |
|-----------------------|---------|
| Offline prefetch set | §2.2, 6B |
| Connectivity banner | §2.5–2.6, 6D–6E |
| Local-first / persistence (roadmap §0) | §2.1 |
| Map §3.6 offline cache | §2.2–2.3 |
| Map §3.12 PWA/banner (probe only) | §2.4–2.6 |
| Matrix P0 offline prefetch | §2.2 |
| Matrix P1 connectivity banner | §2.6 (ship in Phase 6 — roadmap Phase 6 user story) |
| Map §3.12 getDoc cache fallback | §2.7 |
| `songIndex.ts` cache-first load | §2.9 |

---

## 10. Web file → Flutter port map

| Web file | Flutter target |
|----------|----------------|
| `lib/firestore/sessions.ts` (`cacheSessionOffline`) | `session_repository.dart` |
| `lib/firestore/songs.ts` (`getSong` cache fallback) | `song_repository.dart` |
| `lib/hooks/useOnlineStatus.ts` | `online_status_provider.dart` + `connectivity_probe.dart` |
| `components/OfflineBanner.tsx` | `offline_banner.dart` |
| `components/ClientProviders.tsx` (banner placement) | `app.dart` / shell |
| `public/connectivity.txt` | Hosted on Vercel — client probe only |
| `lib/firebase.ts` (persistent cache) | `firebase_init.dart` / Firestore settings |
| `lib/firestore/songIndex.ts` (cache-first chunks) | Phase 2 `SongIndexRepository` — regression in 6F |
| `public/sw.js` (probe bypass) | N/A — use absolute probe URL |
| `playlists/[id]/page.tsx` (`handleCacheOffline`) | `playlist_detail_screen.dart` |

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Firestore cache size / disk | Document; warn on very large sets; optional concurrency limit |
| `sessionSongs` not in cache if query never ran | Run `listSessionSongs` during prefetch while online; consider server-source query |
| Probe blocked / captive portal | Failed probe → offline banner (conservative); user can still try cached reads |
| `JOIN_API_BASE_URL` wrong → probe always fails | Same define as Phase 5; README |
| False offline on slow networks | 5s timeout + 2s debounce reduces flapping |
| User expects offline playlist list | Copy in banner: “cached songs **and sessions**” — only downloaded sets |
| Android Doze stops poll | Resume on `AppLifecycleState.resumed` |
| User downloads set but never opened home | Search/add-song still needs index — document in README |
| Assuming `navigator.onLine` / radio = online | Probe is source of truth for banner |
| Partial download success | Match web all-or-nothing; no “3/5 cached” state |

---

## 12. What comes next (not Phase 6 gaps)

| Web map | Phase |
|---------|--------|
| Groups offline | 7 |
| Share-by-username | v1.1 |
| App Check enforcement | 8 / ops |
| Bulk library export | Never mobile v1 |

---

## 13. After Phase 6

- **Phase 7:** [`flutter-phase-7-groups.md`](flutter-phase-7-groups.md) — groups + home group playlists.
- **Phase 5 doc:** Remove “hide cache button” note — enabled by Phase 6.
- **Phase 2/3 docs:** Cross-link offline verification here.

---

*End of Phase 6 plan.*
