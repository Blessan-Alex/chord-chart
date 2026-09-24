# Flutter Phase 8 — Full-stack parity & UI audit (Phase A)

**Status:** Phase A complete (evidence gathered). **Exit:** **NOT MET** — open P0 blockers remain.  
**Sign-off:** [`flutter-phase-8-release-signoff.md`](flutter-phase-8-release-signoff.md) = **BLOCKED**  
**Binary scope:** Android beta candidate includes **Phase 7 groups** (code on `main`).  
**Evidence date:** 2026-03-23 · **Build:** debug analysis + unit tests only  

**Spec hierarchy used:** web reports → `flutter-web-app-map.md` → roadmap §3 → phase plans 1–7.

---

## Executive summary

| Item | Result |
|------|--------|
| Automated tests | **PASS** — 97 tests green |
| `flutter analyze` | **PASS** (7 info-level lints only) |
| Code-level parity (routes, domain ports, copy spot-check) | **Mostly PASS** with noted gaps |
| Manual integration scripts (§2.1–2.10) | **FAIL** — not executed on release device |
| Release engineering (signing, App Links, Play) | **FAIL** — Phase B not started |
| **Open P0 count** | **12** |

**Do not upload to Play** until sign-off = **APPROVED FOR BETA**.

---

## A1 — Route & screen inventory

Source: [`flutter-web-app-map.md`](flutter-web-app-map.md) §2.1, roadmap §5, `mobile/lib/core/routing/`.

| Web route | Flutter route | Auth/guest | In beta? | Audit status | Mobile evidence |
|-----------|---------------|------------|----------|--------------|-----------------|
| `/login` | `/login` | Guest | Yes | **PASS** | `app_router.dart`, `login_screen.dart` |
| `/signup` | `/signup` | Guest | Yes | **PASS** | `signup_screen.dart` |
| `/onboarding/username` | `/onboarding/username` | Auth | Yes | **PASS** | `username_onboarding_screen.dart`, redirect in `app_router.dart` |
| `/` home library | `/home` | Guest OK | Yes | **PASS** | `home_screen.dart`; intentional path diff (approved) |
| `/song/[id]` + queries | `/song/:id` | Guest OK | Yes | **PASS** | `song_screen.dart`, `session_navigation.dart` |
| `/song/[id]/edit` | — | Admin | **Never** | **PASS** | No route; `safe_redirect` rejects `/admin`, edit paths |
| `/playlists` | `/playlists` | Auth | Yes | **PASS** | Shell + `playlists_screen.dart` |
| `/playlists/new` | `/playlists/new` | Auth | Yes | **PASS** | Root nav `create_playlist_screen.dart` |
| `/playlists/[id]` | `/playlists/:sessionId` | Auth | Yes | **PASS** | `playlist_detail_screen.dart` |
| `/join/p/[token]` | `/join/p/:token` | Auth to join | Yes | **PARTIAL** | Route exists; **App Links / release smoke not verified** (P0-006) |
| `/profile` | `/profile` | Auth for shell | Yes | **PASS** | `profile_screen.dart` |
| `/groups` | `/groups` | Auth + username | Yes (v1.1 in binary) | **PASS** | Phase 7 shipped |
| `/groups/[id]` | `/groups/:groupId` | Member | Yes (v1.1) | **PASS** | `group_detail_screen.dart` |
| `/admin` | — | Never | Never | **PASS** | No route |
| `/import` | — | Never | Never | **PASS** | No route |

**Deep link host (web):** `https://lfchords.vercel.app/join/p/*`, `/song/*` — **Flutter manifest App Links not configured** → P0-006.

---

## A2 — Feature matrix (roadmap §3)

Legend: **PASS** = code + unit tests align with web reports; **FAIL** = gap or unverified manual; **WAIVED** = documented product exception.

### P0 — Flutter v1 = Yes

| Feature | Status | Web proof | Mobile proof | If FAIL → owner |
|---------|--------|-----------|--------------|-----------------|
| Email login / signup / errors | **PASS** | `authErrors.ts`, phase 1 report | `auth_repository.dart`, `validation_test.dart` | Phase 1 |
| Google Sign-In | **PARTIAL** | Phase 1 report | Debug SHA doc’d; **release SHA + device not verified** | P0-004 Phase 1/8B |
| Safe `next` redirect | **PASS** | `safeRedirect.ts` | `safe_redirect_test.dart` | Phase 1 |
| Username onboarding gate | **PASS** | Phase 1 report | `app_router.dart` redirect | Phase 1 |
| Profile display name, theme, sign out | **PASS** | map §3.8 | `profile_screen.dart` | Phase 1 |
| Index chunk0 + merge | **PASS** | phase 2 report | `song_index_providers.dart` | Phase 2 |
| Search cap **100** / browse **10/page** | **PASS** | verification #1 | `song_search_rank_test.dart`, `library_browse.dart` | Phase 2 |
| Filters key/lang/artist | **PASS** | phase 2 report | `library_filter_sheet.dart` | Phase 2 |
| Guest library read | **PASS** | map §3.3 | Guest card on home; no login gate on `/home` | Phase 2 |
| Song chart read-only | **PASS** | phase 3 report | `song_screen.dart` | Phase 3 |
| Transpose + numbers | **PASS** | `engine.ts` | `engine_test.dart` | Phase 3 |
| Zoom + chart theme | **PASS** | phase 3/4 | `performance_preferences_test.dart` | Phase 3–4 |
| Live song snapshot | **PASS** | `useSongLive` | Firestore stream on song screen | Phase 3 |
| Performance autoscroll + wakelock | **PASS** (code) | phase 4 report | `autoscroll_engine.dart`, tests | **Manual 5 min** → P0-003 Phase 4/8 |
| Playlist query nav | **PASS** | `sessionNavigation.ts` | `session_navigation_test.dart` | Phase 4–5 |
| `listPlaylistsForUser` merge | **PASS** | phase 5 report | `session_repository.dart` + groupId filter | Phase 5 |
| Create / session songs / reorder / key | **PASS** | phase 5 report | repos + detail UI | Phase 5 |
| Invite link + join API | **PARTIAL** | map §6.1 | `JoinApiClient`, join screen | **Two-device release test** P0-005 |
| Offline prefetch set | **PASS** (code) | phase 6 report | `cacheSessionOffline`, detail button | **Airplane manual** P0-003 |
| Connectivity banner + probe | **PASS** | phase 6 report | `offline_banner_test.dart`, probe tests | **Probe on device** P0-003 |
| Deep links join + song | **FAIL** | map §2.3 | `go_router` routes only | **P0-006** Phase 8C |
| Never admin/import/edit | **PASS** | map §3.9–11 | No routes; redirect tests | — |

### P1 — Required for beta unless waived

| Feature | Status | Notes |
|---------|--------|-------|
| Recent songs (max 10) | **PASS** | `recent_songs_section.dart`, providers |
| Publish status display | **PASS** | `playlist_labels.dart`, cards |
| Song share URL | **PASS** | `share_plus` on `song_screen.dart` |
| Share by @username (playlist) | **PASS** | Phase 7G `share_playlist_sheet.dart` |
| Connectivity banner copy | **PASS** | Exact match test |
| Groups (in binary) | **PARTIAL** | Code complete; **manual two-account** P0-007; **playlistCount rules** P0-008 |
| a11y spot-check | **FAIL** | Not executed P1-002 |

### v1.1 / Defer (documented)

| Feature | Status |
|---------|--------|
| Crashlytics | **N/A** — not in binary |
| Admin | **PASS** — absent |

---

## A3 — UI & copy parity

Side-by-side spot-check (web source vs Flutter). **Not pixel-perfect** — action + string parity.

### Approved mobile-only diffs

| Topic | Web | Mobile | Approved |
|-------|-----|--------|----------|
| Home path | `/` | `/home` | Yes — roadmap §5 |
| Navigation | Sidebar + drawer | Bottom `NavigationBar` 4 tabs | Yes |
| Shell order | home, playlists, groups, profile | Same order | Yes |
| Google sign-in | Web OAuth | Native + `serverClientId` | Yes |

### Copy diff log (sample — full pass on P0 strings)

| String | Web source | Mobile actual | Action |
|--------|------------|---------------|--------|
| Offline banner | `OfflineBanner.tsx` | `You're offline. Cached songs and sessions may still be available.` | **Match** — `offline_banner_test.dart` |
| Library cap banner | verification / web home | `Showing 100 of N songs — search or filter to narrow the list.` | **Match** — `home_cap_banner_test.dart` |
| Cache playlist success | web playlist detail | `Playlist cached for offline use.` | **Match** — `playlist_detail_screen.dart:338` |
| Private playlist deny | web detail | `This private playlist is only visible to the owner and invited members.` | **Match** |
| Playlist sections | web playlists page | `My private playlists`, `Shared with me`, `Public playlists` | **Match** — `playlists_screen.dart` |
| Join group helper | `JoinGroupModal.tsx:78` | `Enter the 8-character code from your group leader.` | **Match** — `group_sheets.dart` |
| Home guest CTA | web | `Sign in for playlists & groups` | **Intentional** — mobile guest card |
| Home MY PLAYLISTS label | web “My playlists” | `MY PLAYLISTS` (labelSmall caps) | **Intentional** — typography |
| Song share URL host | web prod | README mentions `lfchords.app`; code uses share helper | **Verify** P1-003 vs prod URL |
| README “No username share” | — | README §Phase 5 outdated | **Fix doc** P1-004 (code has share sheet) |

### Screen notes (abbrev.)

| Screen | Status | Gap |
|--------|--------|-----|
| Auth forms | **PASS** | Manual Firebase error strings vs `auth_errors.dart` — spot OK |
| Home | **PASS** | Group strip gated like web (no search/filters) |
| Song / performance | **PASS** (code) | Rotation smoke not run |
| Playlists / join | **PARTIAL** | Join E2E not run |
| Profile | **PASS** | No Administrator label |
| Groups | **PASS** (UI copy) | Manual join/create flows not run |

---

## A4 — Cross-feature integration scripts (manual)

**Requirement:** Release-signed physical device, two accounts where noted.  
**Executed:** **None** (Phase A agent — code audit only).

| Script ID | Phase 8 § | Description | Status | versionCode | Tester | Date |
|-----------|-----------|-------------|--------|-------------|--------|------|
| M-001 | 2.3 | Guest browse → song | **NOT RUN** | — | — | — |
| M-002 | 2.1 | Signup → username → home | **NOT RUN** | — | — | — |
| M-003 | 2.1 | Google release sign-in | **NOT RUN** | — | — | — |
| M-004 | 2.6 | Playlist 5 songs reorder key publish share join B | **NOT RUN** | — | — | — |
| M-005 | 2.5 | Start set autoscroll 5 min wakelock | **NOT RUN** | — | — | — |
| M-006 | 2.7 | Download set → airplane | **NOT RUN** | — | — | — |
| M-007 | 2.7 | Probe fail → banner → restore | **NOT RUN** | — | — | — |
| M-008 | 4 / 2.6 | Deep link join + song on **release** | **NOT RUN** | — | — | — |
| M-009 | 2.9 | No admin/edit paths | **NOT RUN** (code PASS) | — | — | — |
| M-010 | 2.10 | Groups two-account + group playlist | **NOT RUN** | — | — | — |

**Blocker:** All M-00x on release build → **P0-003**, **P0-004**, **P0-005**.

---

## A5 — Automated quality gate

| Check | Status | Evidence |
|-------|--------|----------|
| `flutter test` | **PASS** | 97 tests, 2026-03-23, debug |
| `flutter analyze` | **PASS*** | 7× info only (`prefer_initializing_formals`, `unnecessary_underscores`) |
| Domain ports (phase 8 §2.8 min set) | **PASS** | `engine`, `song_search_rank`, `song_search_text`, `chord_layout`, `wrap_lyric_line`, `validation`, `session_navigation`, `autoscroll_speed` tests present |
| `.github/workflows/flutter.yml` | **FAIL** | Only `ci.yml` for webmvp — **P0-002** |
| Chart goldens | **N/A** | Optional P2 |

---

## A6 — Phase Definition-of-done aggregation

In-scope phases for this binary: **1–7**. Checkboxes in phase docs are **process** markers; technical status inferred from repo + reports.

| Phase | DoD (summary) | All checked in doc? | Technical notes |
|-------|---------------|-------------------|-----------------|
| **1** Auth | 14 items | No | Code + unit tests present; **Android release Google + device QA open** |
| **2** Library | 12 items | No | Code + rank tests; **manual browse 100+ songs not recorded** |
| **3** Chart | (see phase doc §9) | No | Implemented per phase 3 report |
| **4** Performance | 12 items | No | Code present; **5 min autoscroll manual open** |
| **5** Playlists | 12 items | No | Join API coded; **two-account join not recorded** |
| **6** Offline | 10 items | No | Banner + cache coded; **airplane not recorded** |
| **7** Groups | 10 items | No | Shipped on main; **manual + rules playlistCount waiver** |

**P0 blocker:** Unchecked DoD items that require **manual** proof → tracked as P0-003 … P0-007 until scripts PASS.

---

## A7 — Gap register

| ID | Sev | Area | Description | Owner | Status |
|----|-----|------|-------------|-------|--------|
| P0-001 | P0 | Process | Phase 8 sign-off blocked; no Play upload | Phase 8 | **OPEN** |
| P0-002 | P0 | CI | No `flutter.yml` — analyze/test not gated on `main` | Phase 8A | **OPEN** |
| P0-003 | P0 | QA | Manual scripts M-001–M-010 not run on **release** device | Phase 8D | **OPEN** |
| P0-004 | P0 | Auth | Google Sign-In **release** SHA not verified on release APK/AAB | Phase 8B | **OPEN** |
| P0-005 | P0 | Join | Two-account invite join + idempotent re-join not verified prod API | Phase 5/8D | **OPEN** |
| P0-006 | P0 | Deep links | No Android App Links in `AndroidManifest.xml`; no `assetlinks.json` verification | Phase 8C | **OPEN** |
| P0-007 | P0 | Groups | Two-account group join + group playlist manual not run | Phase 7/8D | **OPEN** |
| P0-008 | P0 | Groups/Rules | Non-owner `incrementGroupPlaylistCount` denied by Firestore (web same); count may drift | Product/rules | **OPEN** — waiver candidate |
| P0-009 | P0 | Release | `build.gradle.kts` release uses **debug** signing | Phase 8B | **OPEN** |
| P0-010 | P0 | Docs | Phase 1–7 DoD checkboxes / roadmap progress table stale vs repo | Docs | **OPEN** |
| P0-011 | P0 | Phase 8 entry | `IOS_BUILD.md` missing | Phase 8G | **OPEN** |
| P0-012 | P0 | Phase 8 entry | `mobile/README.md` incomplete per Phase 0 DoD (defines, release commands) | Phase 8A | **OPEN** |
| P1-001 | P1 | a11y | Semantics spot-check auth, banner, performance not done | Phase 8 | **OPEN** |
| P1-002 | P1 | Copy | Song share URL host vs prod (`lfchords.vercel.app`) | Phase 3/5 | **OPEN** |
| P1-003 | P1 | Docs | README still says no username share (Phase 7 shipped) | Phase 8A | **OPEN** |
| P1-004 | P1 | Groups | Idempotent join / invite code unit tests thin | Phase 7 | **OPEN** |
| P1-005 | P1 | QA | `subscribeSongIndexUpdates` P1 (Phase 2 DoD) — verify implemented | Phase 2 | **OPEN** |
| P2-001 | P2 | Quality | Analyze info lints cleanup | — | **OPEN** |
| P2-002 | P2 | Goldens | Chart golden tests optional | Phase 3 | **OPEN** |

**Phase A exit:** **NOT MET** (12 open P0).  
**Next:** User review → fix/waive P0 → run manual scripts on release build → set sign-off **READY FOR RELEASE ENGINEERING** → Phase 8B–8H.

---

## Phase B preview (do not start until exit)

When gap register P0 = 0 (or waivers signed):

1. **8A** — `mobile/README.md`, `flutter.yml`, QA checklist artifact  
2. **8B** — Release keystore, Firebase release SHAs  
3. **8C** — App Links + `assetlinks.json`  
4. **8D** — Execute §2 on release AAB  
5. **8E** — Play internal (only after **APPROVED FOR BETA**)  
6. **8F** — App Check prep  
7. **8G** — `IOS_BUILD.md`  
8. Update sign-off → **APPROVED FOR BETA** only with human “ship”

---

## Release artifacts

*(Empty — Phase B not started.)*

---

## Post-beta known P1/P2

*(Empty — populate after Phase B if deferred.)*

---

*End of Phase A parity audit.*
