# Verification report: `docs/flutter-web-app-map.md`

**Auditor role:** Technical verification against live codebase (not a rewrite of the Flutter plan).  
**Verified commit:** `5bfc9903eb0c07cca1a91ea1512907b86d903f2f`  
**Date:** 2026-09-20  

---

## 1. Executive verdict

| Area | Estimated accuracy | Notes |
|------|-------------------|--------|
| Routes (§2.1) | **~92%** | All user-facing `page.tsx` routes covered; `error.tsx` / `global-error.tsx` omitted; a few auth/admin flags oversimplified |
| Data model (§4) | **~95%** | Collections align with `firestore.rules`; `meta` still unused in web client |
| Feature catalog (§3) | **~85%** | Core flows correct; browse cap, TanStack Query, playlist listing/sharing, song fallback, and song-edit reconcile need fixes |
| Security matrix (§7) | **~90%** | Matches rules; minor omission of `createdBy` read path wording |
| Appendix D inventory | **~98%** | 193 `src` `.ts`/`.tsx` files accounted for in grouped tables; paths use `app/(app)/…` form |

**Safe to plan Flutter from this doc?** **Yes, with fixes** — apply errata below (especially §1 limits, §3.3 browse cap, §3.4 localStorage, §3.6 playlists, §3.9 reconcile, stack TanStack Query). Section 9 opinions were not re-litigated.

---

## 2. Critical discrepancies (would mislead Flutter implementation)

| # | Sev | Issue | Evidence | Doc location |
|---|-----|--------|----------|----------------|
| 1 | **High** | **`LIBRARY_BROWSE_CAP` (100) applies to search/filter results, not to default “browse all” library** | `HomePage.tsx`: `isBrowsingAll` paginates full `libraryResults` with `HOME_LIBRARY_PAGE_SIZE`; cap only when `!isBrowsingAll` (`slice(0, LIBRARY_BROWSE_CAP)`) | §1 table, §3.3 |
| 2 | **High** | **TanStack Query is not “provider only”** — used for live song + session songs | `useSongLive.ts`, `useSessionSongsLive.ts` use `useQuery` / `useQueryClient` | §1 stack, §3.6 |
| 3 | **High** | **Playlist list query set misstated** — `listPlaylistsForUser` does **not** include group playlists; no `listSessionsForUser` export | `sessions.ts` `listPlaylistsForUser` (owned, createdBy, shared, published only); group via `listPlaylistsForGroup` on `HomePage.tsx` | §3.6 |
| 4 | **High** | **Playlist sharing is not invite-API-only** — owners can add users via **client Firestore** `sharePlaylistByUsername` | `sessions.ts` `sharePlaylistByUsername`; `playlists/[id]/page.tsx` | §3.6, §7 implication |
| 5 | **High** | **Song `localStorage` fallback when Firebase is on is guest-only + missing Firestore song** | `song/[id]/page.tsx` lines 177–180: only `!liveSong.song && !user` uses `getLocalSong` | §2.1 footnote, §3.4 |
| 6 | **Medium** | **`reconcileDraftWithSong` omitted** from song-edit narrative | `songEdits.ts`, `edit/page.tsx`, `songEdits.integration.test.ts` | §3.9 |
| 7 | **Medium** | **`createSession` auto-creates invite token** on playlist create (best-effort) | `sessions.ts` `attachPlaylistInviteToken` after create | §3.6 (missing) |
| 8 | **Medium** | **Offline detection** is primarily **`/connectivity.txt` probe**, not `navigator.onLine` alone | `useOnlineStatus.ts` `probeConnectivity` | §3.12 |

---

## 3. Section-by-section errata

### §1 Executive summary

- **Stack — TanStack Query:** Change to “provider + `useSongLive` / `useSessionSongsLive` caches”.
- **Limits table — Home browse:** Split row: browse-all = paginate 10/page over full sorted index; **100 cap = search/filter mode only** (`HomePage.tsx` 196–203).
- **Guest behavior:** OK for library/songs; playlists/groups/join need auth — confirmed (`SignInRequired`, rules).

### §2.1 Routes table

- **Missing (non-page):** `app/error.tsx`, `app/global-error.tsx` — Next error boundaries, not product routes (Low).
- **`/onboarding/username`:** Auth required (redirects to login if no user — `onboarding/username/page.tsx` 29–36); **not** wrapped by `UsernameGate` (gate is only in `(app)/layout.tsx`). Doc wrongly lists `UsernameGate` under key components for this route.
- **`/admin`:** “Auth required” is soft — non-admin **and guest** get `router.replace("/")` without login prompt (`admin/page.tsx` 66–72). Not “sign-in required”.
- **`/song/[id]/edit`:** Non-admin signed-in users see “Admin only” **before** `SignInRequired` (`edit/page.tsx` 259–271). Auth flag OK; admin enforced in page.
- **Redirects:** OK — matches `next.config.ts` 28–45.

### §2.2 / §2.3

- Sidebar order and deep links: **OK** (`sidebarNav.ts`, `sessionNavigation.ts`, `join/p/[token]/page.tsx`).

### §3.1 Auth

- Files/exports: **OK** (`AuthProvider.tsx`, `readIsAdmin` from token claims line 98–100).
- `authRedirect`: **sessionStorage** — doc correct (`authRedirect.ts`).

### §3.2 Onboarding

- **OK** — `(app)/layout.tsx` + `UsernameGate.tsx`; onboarding route outside `(app)`.

### §3.3 Home / library

- **WRONG** browse cap (see Critical #1).
- **NUANCED** localStorage: `getSongs()` section shown only when **`!user`** and local songs exist (`HomePage.tsx` ~393), not primary Firebase path — doc mostly OK but could clarify guest-only UI block.
- Index progressive load + listeners: **OK** (`songIndexCache.ts`).

### §3.4 Song view

- **WRONG** localStorage fallback scope (Critical #5).
- Signed-in user with missing Firestore song does **not** fall back to localStorage.
- `useSongLive` + React Query: not mentioned — add.
- Draft/archives load admin-only: **OK** (`page.tsx` 196–203).

### §3.5 Performance mode

- `usePerformanceMode` breakpoint 768 and `sessionId`: **OK** (`usePerformanceMode.ts`).
- `useWakeLock(fullscreen.active || autoscroll.active)`: **OK** (`song/[id]/page.tsx` 90).

### §3.6 Playlists

- Rename `listSessionsForUser` → **`listPlaylistsForUser`**.
- Remove “group” from that merge list; group playlists via **`listPlaylistsForGroup`** (home/groups).
- Add **`sharePlaylistByUsername`** (owner client update).
- Add **`createSession` → `attachPlaylistInviteToken`** on create.
- Join via API: **OK** and idempotent if already shared (`route.ts` 54–56).
- **`canViewPlaylist` helper** omits group members (`sessions.ts` 95–105) but **rules** allow group read — UI may rely on queries; Flutter should use rules-shaped checks.

### §3.7 Groups

- **OK** (`groups.ts`, `isGroupJoinUpdate` in rules).

### §3.8 Profile

- **OK** — guests see sign-in prompt (`profile/page.tsx`).

### §3.9 Song edit

- Add **`reconcileDraftWithSong`** before publish / on `createDraft` when draft exists.
- **`MAX_ARCHIVED_VERSIONS`**: list query slices to 10; publish also deletes excess archives (`songEdits.ts` 313–330) — doc “max 10” OK.

### §3.10 Admin

- Component export is **`AdminStatsCards`** from `AdminStats.tsx`, not `AdminStats` (`AdminStats.tsx` 14).

### §3.11 Import

- Guest: `SignInRequired` wraps content; non-admin signed-in sees block before wrap — **OK** (`import/page.tsx` 42–56, 89).

### §3.12 PWA / offline

- Firestore persistent cache: **OK** (`firebase.ts` 63–69).
- `sw.js`: install caches `/`, manifest, icon; fetch network-first — **OK**; does not cache Firestore.
- Offline banner: fix description (Critical #8).

### §3.13 Theming

- **OK**.

### §4 / §4.11

- Collections match rules. **`songs` read does not require auth** — aligns with guest library.
- **`meta`:** rules only; no web reads found in `webmvp/src` (still TBD content).

### §5 Domain logic port list

- Listed modules **exist**.
- **Omitted but product-relevant** (suggest §5 add as P1/P2): `chordSourceSync.ts`, `chordLabelMeasure.ts`, `lyricMeasurement.ts`, `editorParser.ts`, `sessionDisplay.ts`, `playlistLabels.ts`, `formatError.ts`, `toSong.ts`, `sharePlaylistByUsername` path in `sessions.ts`.

### §6 API / scripts

- Join API: **OK** (body `{ token }`, Bearer, 401/400/404/500, idempotent return `sessionId`).
- `package.json` scripts: **OK** (matches §6.2 / Appendix A).

### §7 Security matrix

- **NUANCED:** `sessions` read also allows `createdBy == uid` (legacy) per rules line 146 — matrix should say “owner **or createdBy**”.
- `playlistInviteTokens` list denied — doc OK.
- Group join update path — doc OK.

### §8 NFR / CI

- **OK** — `.github/workflows/ci.yml` jobs: check (typecheck, lint, test, build), integration (emulators), e2e.

### Appendix D

- All **193** `webmvp/src/**/*.ts(x)` files appear in grouped inventory (spot-check + initial audit).
- **Misleading one-liners (top issues, not exhaustive):** `AdminStats.tsx` → export is `AdminStatsCards`; §3.10 cross-reference.

### Appendix F (stale / dead)

- **`storage.ts`:** still used — **not dead**; guest home + guest song fallback — **confirmed**.
- **`presets.ts` client UI:** still seed-only — **confirmed**.
- **`users.role == 'admin'`:** not in rules — **confirmed**.

---

## 4. Constants table (Phase 2)

| Claim | Doc value | Code value | Status | Reference |
|--------|-----------|------------|--------|-----------|
| Song index capacity | 10,000 (5×2000) | `SONG_INDEX_CAPACITY = 5 * 2000` | **OK** | `songIndex.ts` 20–36 |
| Chunk max bytes | ~900 KiB | `900 * 1024` | **OK** | `songIndex.ts` 49 |
| searchText max | 512 | `SONG_INDEX_SEARCH_TEXT_MAX = 512` | **OK** | `songSearchText.ts` 4 |
| Home browse cap | 100 when not searching | 100 when **searching/filtering**; browse-all uses pagination only | **WRONG** | `HomePage.tsx` 196–203, `constants.ts` |
| Home page size | 10 | `HOME_LIBRARY_PAGE_SIZE = 10` | **OK** | `constants.ts` 5 |
| Published playlist cap | 100 | `PUBLISHED_PLAYLIST_CAP = 100` | **OK** | `constants.ts` 8, `sessions.ts` 192 |
| Max archived edits | 10 | `MAX_ARCHIVED_VERSIONS = 10` | **OK** | `songEdits.ts` 34, 128, 327 |
| Username length | 3–20 | rules + `USERNAME_REGEX` | **OK** | `validation.ts` 5–22, `firestore.rules` 175–176 |
| Invite token min | 12 after normalize | `token.length < 12` → 400 | **OK** | `route.ts` 19–21, `playlistInvites.ts` 114 |
| Generated token length | (not in doc) | `TOKEN_LENGTH = 16` | **NUANCED** | `playlistInviteToken.ts` 3–19 |
| Recent songs max | (not in doc) | `MAX_RECENT = 10` | **Missing** | `recentSongs.ts` 13 |
| Load-test seed max | 10,000 | `count > 10_000` rejected | **OK** | `seed-load-test.ts` |
| Performance breakpoint | 768px | `PERF_BREAKPOINT = 768` | **OK** | `usePerformanceMode.ts` 5 |
| Offline debounce | (not in doc) | `OFFLINE_DEBOUNCE_MS = 2000` | **Missing** | `useOnlineStatus.ts` 8 |

---

## 5. Routes diff (Phase 1)

### In codebase, not in §2.1 table

| Path / file | Role |
|-------------|------|
| `app/error.tsx` | Segment error UI |
| `app/global-error.tsx` | Root error UI |

### In §2.1, verified present

All listed `page.tsx` routes and `api/playlists/join` exist under `webmvp/src/app/`.

### Auth / admin flag corrections

| Route | Doc | Actual |
|-------|-----|--------|
| `/onboarding/username` | UsernameGate | Own auth redirect; **no** UsernameGate wrapper |
| `/admin` | Auth required | Guest/non-admin → `/` without login |
| `/import` | Auth + admin | Guest → `SignInRequired`; user !admin → admin-only message |
| `/song/[id]` | Optional | OK; Firebase guests read active songs |

---

## 6. Rules diff (Phase 3)

| Collection | In doc §4.1 | In `firestore.rules` | Match? |
|------------|-------------|----------------------|--------|
| songs | Yes | Yes | OK |
| songIndex | Yes | Yes | OK |
| songEdits | Yes | Yes | OK |
| sessions + sessionSongs | Yes | Yes | OK |
| playlistInviteTokens | Yes | Yes | OK |
| groups + groupInviteCodes | Yes | Yes | OK |
| users + usernames | Yes | Yes | OK |
| meta | Yes | Yes | OK (unused in web app) |

**Understated in doc:** Musicians **cannot** write `sharedWith` unless owner update — except owners **can** via client `sharePlaylistByUsername` (allowed by owner update rule). Invite join uses Admin API for non-owners.

**Special paths documented correctly:** `isGroupJoinUpdate`, `canReadPlaylist`, `canDeletePlaylist`.

---

## 7. Missing features (in code, not in doc)

1. **`sharePlaylistByUsername`** — owner shares by @username (`sessions.ts`, playlist detail page).
2. **Auto invite token on `createSession`** (`attachPlaylistInviteToken`).
3. **Recent songs cap** — 10 entries (`recentSongs.ts`).
4. **Connectivity probe** debounce/poll intervals (`useOnlineStatus.ts`).
5. **`sharePlaylist` / native Web Share** for songs and playlists (`sharePlaylist.ts`).
6. **Rules integration tests** — `rules.integration.test.ts` (doc mentions other integration tests).

---

## 8. Stale / dead code (doc claims vs code)

| Doc claim (Appendix F) | Verification |
|------------------------|------------|
| `storage.ts` legacy | **Still active** for guests — not dead |
| `presets.ts` not in UI | **OK** |
| `users.role == 'admin'` unused in rules | **OK** |
| `/sessions` redirect | **OK** in `next.config.ts` |

---

## 9. Recommended doc patches (applied in main MD where High)

- §1: Fix home browse limit row; fix TanStack Query line.
- §2.1: Fix onboarding components; note `/admin` guest redirect; optional footnote on error boundaries.
- §3.3: Correct browse vs search cap behavior.
- §3.4: Correct localStorage fallback conditions; mention `useSongLive` + React Query.
- §3.6: `listPlaylistsForUser`; group via `listPlaylistsForGroup`; `sharePlaylistByUsername`; create-time invite token; fix React Query sentence.
- §3.9: Document `reconcileDraftWithSong`.
- §3.10: `AdminStatsCards` naming.
- §3.12: `useOnlineStatus` probe behavior.
- §7: Add `createdBy` to session read column.
- Top: Verification subsection + commit + link to this file.

---

## 10. TBD (not verified without runtime)

- End-to-end Google redirect on production domain.
- App Check enforcement behavior in production (warn-only if key unset — `firebase.ts` 102–110).
- Service worker caching of Next.js RSC payloads in production.
- Exact documents under `meta/*` (no client references in `webmvp/src`).
