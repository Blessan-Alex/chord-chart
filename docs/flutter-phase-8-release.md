# Flutter Phase 8 — Beta hardening, Play Store & iOS prep

**Parent:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 8  
**Parity specs:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §9.1 v1 musician scope, §5 domain ports, §6 join API, §3.12 connectivity, §8 NFR  
**Errata:** [`flutter-web-app-map-verification.md`](flutter-web-app-map-verification.md) when present (browse cap, `listPlaylistsForUser`, probe) — QA assertions in §2 follow roadmap matrix defaults if doc missing  
**Implementation plans (must be complete before beta):** [Phase 1](flutter-phase-1-auth.md) · [2](flutter-phase-2-library.md) · [3](flutter-phase-3-song-chart.md) · [4](flutter-phase-4-performance.md) · [5](flutter-phase-5-playlists.md) · [6](flutter-phase-6-offline.md) · [7](flutter-phase-7-groups.md) optional  
**Roadmap alignment:** §3 feature matrix (v1 **Yes** rows), §5 routes, §7 testing, §8 release; Phase 0 steps 10–11, 13; open questions (Crashlytics, guest read, Join API host)  
**Depends on:** **Phases 1–6** DoD for v1 Android beta; **Phase 7** only if product ships groups in same binary  
**Backend / ops:** Firebase `song-db-5e4ed`, Play Console, Apple Developer (iOS doc), **Vercel** `POST /api/playlists/join`, `GET /connectivity.txt`, `/.well-known/assetlinks.json`, `apple-app-site-association`

**Goal:** Ship a **trustworthy Android internal/closed beta** on Play Store, with **release signing**, **deep links** for playlist join and song URLs, documented **defines**, regression QA, and an **`IOS_BUILD.md`** playbook for a later Mac/TestFlight week — **no new product features** unless blocking bugs.

**Estimate:** 2 person-weeks Android-focused (1 FTE); +1 week calendar with Mac for iOS execution

**Phase 8 does not implement musician features** — it validates that Phases 1–6 (and optional 7) match web + roadmap, then packages for store. Any missing parity is either a **release blocker** (fix in phase owner doc) or an explicit **v1.1 defer** (groups, share-by-@username, Crashlytics).

---

## 0. Entry criteria (before Phase 8 work)

| Gate | Source |
|------|--------|
| Phases **1–6** definition-of-done checked in each phase doc | Roadmap §4 |
| Roadmap **Appendix A** dependencies in `mobile/pubspec.yaml` (not only `firebase_core`) | Phase 0 step 8 |
| Firestore **offline persistence** enabled (`cloud_firestore`) | Roadmap §0, Phase 1 |
| `JOIN_API_BASE_URL` + `FLAVOR` documented (`mobile/README.md`) | Phase 0 steps 11, 15 |
| **No** admin routes, **no** `songEdits` reads, **no** guest `localStorage` songs | Roadmap out-of-scope, map §3.9–3.11, verification #5 |
| **Ignore** `admin` custom claim for navigation and UI (musician app) | Map §1, §4.11 |
| Domain **unit tests** ported for map §5 **v1 Yes** modules | Roadmap §7 |

If any P0 matrix row (§1.1 below) fails, **do not** upload to Play — fix under the owning phase, then re-run Phase 8 QA.

---

## 1. Scope summary

### 1.1 Musician v1 parity matrix (release gate)

Every **Flutter v1 = Yes** row in roadmap §3 must pass §2 QA (web map §9.1 equivalent).

| Area | Must work (roadmap §3 / map) |
|------|------------------------------|
| Auth | Email, Google, errors, safe `next`, signup + username |
| Onboarding | Username claim; block shell until set |
| Profile | Display name, @username, theme (`lf-theme`), sign out |
| Library | Guest read; chunk0-first index; search cap **100**; browse **10/page** without 100 cap; filters |
| Song | Read-only chart; transpose + numbers; zoom + chart theme; live snapshot; **no** localStorage fallback path |
| Performance | Autoscroll, wakelock, immersive/stage UI; playlist `playlist`/`index`/`key` nav + swipe |
| Playlists | `listPlaylistsForUser` merge; create; session songs add/remove/**reorder**/**key override**; publish **display**; invite link + **join API**; idempotent join |
| Share | Invite link + **song URL** via native share sheet (`share_plus`) — map §9.1 |
| Offline | `cacheSessionOffline` “download set”; Firestore cache reads |
| Connectivity | Banner from **HTTP probe** to `{JOIN_API_BASE_URL}/connectivity.txt` (not SW) — map §3.12, Phase 6 |
| Deep links | `/join/p/:token`, `/song/:id` + query params — roadmap §5 |
| **Never** | Admin, import, edit, `songEdits`, index/song writes, localStorage song CRUD |

**v1.1 (optional in same beta):** groups (Phase 7), share-by-@username, Crashlytics — extra §2.10 checklist if shipped.

### In scope (Phase 8)

| Area | Roadmap / map reference | Flutter deliverable |
|------|-------------------------|---------------------|
| Release QA script | Roadmap §7 manual QA | `docs/mobile-qa-checklist.md` or section in `mobile/README.md` — Phases 1–6 flows |
| CI gate | Phase 0 optional CI | `.github/workflows/flutter.yml`: `analyze`, `test`, `build apk --debug` (release job optional) |
| `mobile/README.md` | Phase 0 DoD | Clone, Flutter version, `--dart-define` (`JOIN_API_BASE_URL`, `FLAVOR`), Firebase setup, offline note |
| Android release signing | Roadmap §8 | Upload key + Play App Signing; **release** `signingConfig` (replace debug signing TODO in `build.gradle.kts`) |
| Versioning | Roadmap §8 | `pubspec.yaml` `version: 1.0.0+N`; monotonic `versionCode` / build number per upload |
| Play internal testing | Phase 8 demo | Internal testing track APK/AAB; tester list |
| Store listing (minimal) | Play requirements | App name **LF Chords**, short/full description, screenshots (phone), feature graphic optional |
| Privacy policy URL | Play + Firebase | Public HTTPS URL (church/org hosted); linked in Play Console & store listing |
| Data safety form | Play Console | Declare Firebase Auth, Firestore, crash data if Crashlytics enabled |
| Deep links — Android | Roadmap §5 | App Links: `https://lfchords.vercel.app/join/p/*`, `/song/*`; intent-filters + `android:autoVerify` |
| Deep links — routing | Phase 5 join, Phase 3 song | `go_router` routes `/join/p/:token`, `/song/:id` with query params |
| Custom URL scheme | Roadmap §5 | `lfchords://join/p/{token}` fallback in manifest |
| **assetlinks.json** | Roadmap ops | Publish on web host (`/.well-known/assetlinks.json`) with release cert SHA-256 |
| App Check (prepare) | Phase 0 step 10, map | Register **Play Integrity** (Android); document **App Attest** (iOS); add `firebase_app_check` behind flag — **enforce** only after web + mobile coordinated |
| Join API prod check | Phase 5 risk | Release build uses prod `JOIN_API_BASE_URL`; smoke join on physical device |
| Google Sign-In release | Phase 1 | Register **release** SHA-1/SHA-256 in Firebase; verify login on release build |
| Performance / battery | Roadmap QA §7 | Smoke autoscroll + wakelock on release build |
| Offline smoke | Phase 6 | Download set → airplane mode on release build |
| iOS documentation | Roadmap §8, §7 iOS checklist | **`mobile/IOS_BUILD.md`**: bundle id, Firebase iOS app, GoogleService-Info, URL schemes, universal links, Archive, TestFlight |
| iOS config in repo | Phase 0 shell | Ensure `ios/` project, `com.lfchords.lfChords`, deployment target 13+ — **build on Mac** out of band |
| Accessibility pass | Map §3.13 P1 | Spot-check semantics on auth, offline banner, performance controls |
| Bug-fix buffer | Phase 8 | P0/P1 defects from QA before promoting track |
| Parity gap triage | Map §9.5 risks | Track blockers vs v1.1 defer; no “ship beta” with P0 matrix gaps |
| `pubspec` / minSdk | Phase 0 | `minSdk` **23**; release `compileSdk` current; lock dependency versions for RC |
| Join API contract | Map §6.1 | Bearer ID token; body `{ "token" }` normalized ≥ **12** chars; handle 401/400/404 |
| Ops: `connectivity.txt` on Vercel | Phase 6 | Probe returns `ok` / 200 — required for offline banner parity |
| **Never ship** checks | QA script | Attempt `/admin`, song edit, `songs` write — must be impossible |

### In scope (optional / v1.1)

| Item | Note |
|------|------|
| `firebase_crashlytics` | Roadmap open Q: default **v1.1** — enable in Phase 8 only if team opts in |
| Closed / open testing tracks | After internal validation |
| Golden test expansion | Phase 7 polish — CI optional |
| Groups in same beta binary | Only if Phase 7 shipped before store upload |

### Out of scope (Phase 8)

| Item | Note |
|------|------|
| New musician features | Belongs in Phases 1–7 |
| Admin / song authoring | Web only |
| Play Store **production** rollout to public | Beta/internal first; production promotion is ops decision |
| Mac-hosted CI for iOS | Doc + manual TestFlight only |
| Hosting migration off Vercel | Join API + probe stay on current host unless ops moves |
| App Check **enforcement** without web alignment | Do not lock Firestore until both clients send valid tokens |
| PWA / service worker parity | N/A |

### Mobile vs web (release)

| Topic | Web | Flutter Phase 8 |
|-------|-----|------------------|
| Distribution | Vercel PWA | Play Store (Android); TestFlight doc (iOS) |
| Deep link host | Same origin | Universal/App Links to `lfchords.vercel.app` paths |
| Version | `webmvp` package version | Independent mobile semver `1.0.0` |
| App Check | reCAPTCHA Enterprise optional | Play Integrity / App Attest |

---

## 2. Release readiness checklist (Phases 1–6)

Run on **release-signed** build on **physical Android** device (not only emulator). Use **two accounts** for playlist join (roadmap §7). Record `versionCode`, git SHA, and tester sign-off.

### 2.1 Auth & onboarding (Phase 1)

- [ ] Email signup with username; duplicate username error; rollback on profile failure (map §3.1).
- [ ] Email login; wrong password → mapped Firebase message.
- [ ] Google Sign-In (**release** SHA-1/256 in Firebase + Play signing cert if applicable).
- [ ] Username onboarding gate; cannot reach `/home` shell tabs until username set.
- [ ] `next` preserved: guest opens join link → login/signup → lands on join or playlist (map §2.1).
- [ ] `next` rejects `//`, off-app URLs, `/onboarding/username` loops, web-only paths (`/admin`, `/import`, edit routes).
- [ ] Bootstrap: loading until `profileResolved`; profile read failure does not trap on onboarding (Phase 1).
- [ ] No admin routes, no Administrator label, **no** routing on `admin` claim.

### 2.2 Profile & shell (Phase 1)

- [ ] `/profile`: display name edit, @username display, theme light/dark (`lf-theme`), sign out.
- [ ] Guest: `/profile` and `/playlists` → login (roadmap §5).
- [ ] Bottom nav: Home, Playlists, Profile (Groups tab only if Phase 7 shipped).
- [ ] Home signed-in: “My playlists” / previews per Phase 5 (if on web home).

### 2.3 Library (Phase 2)

- [ ] **Guest** can open home and browse/search without login (default product stance).
- [ ] Index chunk0-first; full merge chunks 0–4; no full `songs` collection scan.
- [ ] **Search/filter active:** results capped at **100** (verification / roadmap §3).
- [ ] **Browse-all (no search):** pagination **10/page**, sorted by `updatedAtMs` — **not** capped at 100.
- [ ] Filters: key, language tags, artist (`libraryArtists`, `languageTags`).
- [ ] Recent songs (max 10, prefs) if P1 shipped.
- [ ] Tap row → `/song/:id`.

### 2.4 Song chart (Phase 3)

- [ ] Chart render; transpose; Nashville numbers; zoom + chart theme prefs.
- [ ] Live `snapshots()` update when song changes on web admin.
- [ ] Indic lyrics (Noto via `google_fonts`) if library contains tagged songs.
- [ ] **Guest** can view active Firestore song; **no** `localStorage` / `getLocalSong` path on mobile.
- [ ] Deep link `.../song/{id}?playlist=...&index=...&key=...` opens correct context (map §3.4, `sessionNavigation`).
- [ ] Share song link via native share sheet (map §9.1 P1).
- [ ] Add to playlist from song (if web `AddToPlaylistModal` parity shipped in Phase 5).
- [ ] Landscape: chart/performance layout usable (roadmap QA “rotation” — device orientation smoke).

### 2.5 Performance (Phase 4)

- [ ] Enter performance from song; immersive/stage chrome; chart theme on bottom bar.
- [ ] Playlist context prev/next + swipe; query params honored.
- [ ] Autoscroll **5+ minutes**; screen stays on (`wakelock_plus`).
- [ ] Zoom/theme prefs persist across sessions.

### 2.6 Playlists & join (Phase 5)

- [ ] List playlists via **`listPlaylistsForUser`** semantics (owned, shared, published cap **100**).
- [ ] Create playlist; add **≥5** songs; remove; **reorder**; per-song **key override** / notes if on web.
- [ ] Publish status **display** (musician view, not admin publish workflow).
- [ ] Owner: copy/share invite link (`share_plus`); token doc + `shareToken` behavior.
- [ ] **Device B / account B:** open `https://lfchords.vercel.app/join/p/{token}` → app (App Link) or browser → login if needed → **POST join** → playlist detail.
- [ ] Idempotent join: second join same token → success, no duplicate errors.
- [ ] Invalid/expired token → user-visible error (400/404 from API).
- [ ] Logged-out join: sign-in required before API call (map §2.1).
- [ ] Release build `JOIN_API_BASE_URL=https://lfchords.vercel.app` (or team-confirmed prod).

### 2.7 Offline & connectivity (Phase 6)

- [ ] “Download set” prefetch (`cacheSessionOffline` parity); progress/error UX.
- [ ] Airplane mode: open downloaded set + charts + set navigation.
- [ ] Offline banner after **debounce** when probe fails; clears when probe succeeds.
- [ ] Probe hits **`{JOIN_API_BASE_URL}/connectivity.txt`** (200, body `ok`) — not cached local asset.
- [ ] Firestore persistence: previously viewed songs/playlists still readable offline without explicit download where cached.

### 2.8 Automated tests (roadmap §7 + map §5)

- [ ] `flutter test` green in CI.
- [ ] Domain ports with web spec tests present: `engine`, `song_search_rank`, `song_search_text`, `chord_layout`, `wrap_lyric_line`, `validation`, `session_navigation`, `autoscroll_speed` (minimum set).
- [ ] Optional: chart golden(s) for release confidence (Phase 3/7 polish).

### 2.9 Security & anti-patterns (must fail)

- [ ] No UI path to admin, import, or song edit.
- [ ] Client never writes `songs`, `songIndex`, `songEdits`.
- [ ] Join invitee cannot self-append `sharedWith` without join API.

### 2.10 Optional — Phase 7 groups (v1.1 binary only)

- [ ] Create/join group by 8-char code; group playlists; home group preview cards (Phase 7 doc).

### 2.11 Regression sign-off

Map §2.1–2.7 to roadmap §7 manual QA items 1–7; attach build metadata and tester names.

---

## 3. Android release engineering

### 3.1 Signing

1. Create upload keystore (org secure storage — **not** in git).
2. Configure `android/app/build.gradle.kts` release `signingConfigs` via `key.properties` (gitignored) or CI secret.
3. Enable **Play App Signing** in Play Console (Google manages app signing key).
4. **`assetlinks.json` SHA-256:** use the certificate from Play Console → **App signing key certificate** (the key users’ devices trust), **not** only the upload key. If links fail after first Play upload, update `assetlinks.json` with the Play-provided SHA-256.
5. Register **both** upload and app-signing SHA-1/256 in **Firebase** (Google Sign-In).

Current repo state: release build still uses **debug** signing — **must fix** before Play upload.

### 3.2 Build artifacts

```bash
cd mobile
flutter build appbundle --release \
  --dart-define=JOIN_API_BASE_URL=https://lfchords.vercel.app
```

- Prefer **AAB** for Play Store; keep APK for sideload QA if needed.
- Document all `--dart-define` flags in `mobile/README.md`.

### 3.3 `version` / `versionCode`

- `pubspec.yaml`: `version: 1.0.0+1` → `1.0.0+2` for each Play upload.
- Changelog: `mobile/CHANGELOG.md` or repo root (team convention).

### 3.4 Play Console (internal testing)

| Field | Guidance |
|-------|----------|
| Package | `com.lfchords.lf_chords` |
| Category | Music & audio or Lifestyle (team choice) |
| Content rating | Questionnaire |
| Privacy policy | HTTPS URL required |
| Data safety | Auth identifiers, app activity (Firestore), optional crash logs |
| Testers | Email list or Google Group |

### 3.5 ProGuard / R8

- Default Flutter R8; add keep rules only if Firebase/Google Sign-In shrink issues appear.

---

## 4. Deep linking

### 4.1 URLs (roadmap §5)

| URL | Route |
|-----|--------|
| `https://lfchords.vercel.app/join/p/{token}` | `/join/p/:token` (Phase 5) |
| `https://lfchords.vercel.app/song/{id}` | `/song/:id` (+ query `playlist`, `index`, `key`) |
| `lfchords://join/p/{token}` | Same join route (fallback) |

### 4.2 Android App Links

- `AndroidManifest.xml` intent-filters with `android:autoVerify="true"`.
- Host: `lfchords.vercel.app` (confirm prod domain with team).
- **`/.well-known/assetlinks.json`** on Vercel (ops + mobile lead):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.lfchords.lf_chords",
    "sha256_cert_fingerprints": ["RELEASE_SHA256_HERE"]
  }
}]
```

- Verify: `adb shell pm get-app-links com.lfchords.lf_chords`

### 4.3 iOS Universal Links (document in `IOS_BUILD.md`)

- Associated Domains: `applinks:lfchords.vercel.app`
- Host `apple-app-site-association` on same domain (no `.json` extension).
- Team ID + bundle id `com.lfchords.lfChords`.

### 4.4 `go_router`

- Ensure `initialLocation` / redirect does not strip join path.
- Cold start from link: auth → login with `next` preserved (Phase 1).
- Routes match roadmap §5 screen map (`/home`, `/login`, `/signup`, `/onboarding/username`, `/playlists`, `/playlists/new`, `/playlists/:id`, `/join/p/:token`, `/song/:id`, `/profile`; `/groups/*` if Phase 7).

### 4.5 Join API (map §6.1) — release smoke

| Check | Expected |
|-------|----------|
| `POST {JOIN_API_BASE_URL}/api/playlists/join` | HTTPS only in release |
| Header | `Authorization: Bearer <Firebase ID token>` |
| Body | `{ "token": "<normalized ≥12 chars>" }` |
| 200 | `{ "sessionId": "..." }` → navigate to playlist detail |
| 401 | Not signed in — prompt login, retry |
| 400 / 404 | User-visible error; no crash |

Client port: `joinPlaylistByInviteToken` / `JoinApiClient` (Phase 5).

### 4.6 Web host ops (monorepo / Vercel)

| Asset | Purpose |
|-------|---------|
| `/.well-known/assetlinks.json` | Android App Links verification |
| `/apple-app-site-association` | iOS Universal Links |
| `/connectivity.txt` | Offline banner probe (Phase 6) |
| `/api/playlists/join` | Playlist invite acceptance |

Coordinate deploy with `webmvp` so mobile release does not break join or probe.

---

## 5. Firebase & App Check

### 5.1 Release Firebase config

- `firebase_options.dart` + `google-services.json` for **prod** project `song-db-5e4ed`.
- Add **release** SHA-1 and SHA-256 to Firebase Android app.
- iOS: `GoogleService-Info.plist` on Mac week.

### 5.2 App Check (coordinate with web — map)

| Platform | Provider |
|----------|----------|
| Android | Play Integrity |
| iOS | App Attest (Device Check fallback per Firebase docs) |
| Web | reCAPTCHA Enterprise (existing optional key) |

**Phase 8 deliverable:** register providers, integrate `firebase_app_check` in `firebase_init.dart`, debug tokens for local dev — **do not** enable Firestore enforcement until web team confirms dual rollout.

### 5.3 Crashlytics (optional)

- If enabled: `firebase_crashlytics`, `FlutterError.onError`, symbol upload for release builds.
- Default per roadmap: **defer** to v1.1 unless beta needs crash signal.

---

## 6. CI & quality gates

### 6.1 GitHub Actions (complete Phase 0)

```yaml
# .github/workflows/flutter.yml (sketch)
- flutter pub get
- flutter analyze
- flutter test
- flutter build apk --debug
```

Optional: `flutter build appbundle --release` on tagged releases with secrets.

### 6.2 Pre-upload gate

- [ ] `flutter analyze` clean (or agreed exceptions).
- [ ] `flutter test` green (includes map §5 **v1 Yes** domain tests).
- [ ] QA checklist §2 signed off on release build.
- [ ] Phase **1.1** parity matrix: no open P0 rows.

### 6.3 Manual QA ↔ roadmap §7 (index)

| Roadmap §7 item | Phase 8 §2 |
|-----------------|------------|
| 1 Auth | §2.1 |
| 2 Onboarding | §2.1 |
| 3 Home search cap / browse | §2.3 |
| 4 Song transpose, numbers, rotation | §2.4 (orientation) |
| 5 Performance autoscroll, wakelock | §2.5 |
| 6 Playlist create, 5 songs, reorder, join 2nd device | §2.6 |
| 7 Offline download, airplane mode | §2.7 |

---

## 7. iOS prep (`IOS_BUILD.md` outline)

Document only unless Mac available in this phase.

| Section | Content |
|---------|---------|
| Prerequisites | Mac, Xcode, Apple Developer account, CocoaPods |
| Bundle ID | `com.lfchords.lfChords` |
| Firebase | Add iOS app, download plist, `flutterfire configure` |
| Google Sign-In | iOS client ID, `REVERSED_CLIENT_ID` URL scheme in `Info.plist` |
| Signing | Team, capabilities, Associated Domains |
| Build | `flutter build ipa` or Xcode Archive |
| TestFlight | App Store Connect, internal testers |
| Smoke | Auth, one song, one playlist join link, safe area, wakelock |

Roadmap §7 iOS checklist: Google iOS client, universal links, TestFlight smoke, safe area, wakelock.

---

## 8. Documentation deliverables

| File | Purpose |
|------|---------|
| `mobile/README.md` | Dev setup, defines, Firebase SHA, run/release commands |
| `mobile/IOS_BUILD.md` | Mac/TestFlight playbook |
| `mobile/CHANGELOG.md` | User-visible release notes (optional) |
| `docs/mobile-qa-checklist.md` | Optional — or embed in README |

Update [`flutter-roadmap.md`](flutter-roadmap.md) progress table when Phase 8 ships.

---

## 9. Sub-phases (implementation order)

### Phase 8A — Docs & CI (2–3 days)

- [ ] Finish `mobile/README.md`; QA checklist from §2.
- [ ] Land `flutter.yml`; fix analyze/test blockers.

### Phase 8B — Release signing & build (2–3 days)

- [ ] Keystore + Gradle config; release AAB locally.
- [ ] Firebase release SHAs; Google Sign-In on release build.

### Phase 8C — Deep links (2–4 days)

- [ ] Manifest intent-filters; `go_router` cold-start tests.
- [ ] Coordinate `assetlinks.json` deploy on Vercel; verify App Links.

### Phase 8D — QA & bug buffer (3–5 days)

- [ ] Full §2 regression; file/fix P0/P1.
- [ ] Join API + `connectivity.txt` probe on release defines.
- [ ] Parity gap triage: P0 matrix → fix in Phases 1–6; P1/v1.1 → document defer.

### Phase 8E — Play internal track (1–2 days)

- [ ] Store listing, privacy URL, data safety, upload AAB, internal testers.

### Phase 8F — App Check prep (1–2 days, parallel)

- [ ] SDK integration behind flag; console registration; doc enforcement plan.

### Phase 8G — iOS doc (1–2 days)

- [ ] Write `IOS_BUILD.md`; verify `ios/` project opens in Xcode on Mac when available.

### Phase 8H — Optional Crashlytics (1 day)

- [ ] Only if team opts in for beta.

---

## 10. Definition of done (Phase 8)

- [ ] Release-signed AAB on Play **internal testing** with ≥1 tester install successful.
- [ ] `assetlinks.json` live; playlist invite link opens app (or chooser) on Android.
- [ ] `mobile/README.md` complete; CI green on `main`.
- [ ] QA checklist §2 executed on release build; roadmap §7 items 1–7 passed.
- [ ] §1.1 musician v1 matrix: all **Yes** rows verified (or explicit product waiver documented).
- [ ] `IOS_BUILD.md` committed; iOS smoke **documented** (execution optional without Mac).
- [ ] App Check providers registered; enforcement **not** enabled without web sign-off (or documented exception).
- [ ] `connectivity.txt` + join API verified on prod host.
- [ ] Roadmap Phase 8 marked complete.

---

## 11. Roadmap & matrix traceability

| Roadmap item | Section |
|--------------|---------|
| §0 vision / local-first / out-of-scope | §0, §1.1, §2.9 |
| §3 feature matrix (all v1 **Yes**) | §1.1, §2 |
| §5 screen & route map | §4.4 |
| §5 deep links table | §4 |
| Phase 8 user stories (internal APK, TestFlight doc, App Check) | §3, §5, §7, §10 |
| §7 unit + manual QA + iOS checklist | §2.8, §2.11, §6.3, §7 |
| §8 Release & operations | §3, §5 |
| §9 open questions (Crashlytics, guest read, Join host) | §1, §5.3, §2.3 |
| Appendix A deps, issues 17–18 | §0, §3, §7 |
| Map §9.1 v1 musician scope | §1.1, §2 |
| Map §5 domain port tests | §2.8, §6.2 |
| Map §6.1 join API | §4.5, §2.6 |
| Map §3.12 connectivity (not PWA/SW) | §2.7 |
| Map §3.8 profile | §2.2 |
| Map §9.5 risks (layout, join host, App Check, no localStorage songs) | §12 |

---

## 12. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| No Mac for iOS | Ship Android beta first; `IOS_BUILD.md` unblocks later week |
| Wrong `JOIN_API_BASE_URL` in release | `--dart-define` in CI/README; smoke join test |
| App Links verification fail | Correct SHA-256; HTTPS host; `autoVerify` |
| Google Sign-In fails on release | Register release SHA; use release build in QA |
| App Check breaks dev | Debug provider + token registration |
| Play policy rejection | Privacy policy + accurate data safety |
| Scope creep | Phase 8 is hardening only — feature bugs yes, features no |
| Shipped beta missing P0 parity | §0 entry criteria + §1.1 matrix gate before Play upload |
| Wrong App Links SHA | Use Play **app signing** cert fingerprint in `assetlinks.json` |
| Probe always “online” | Misconfigured `JOIN_API_BASE_URL` or missing `connectivity.txt` on host |
| Chord/search regressions | Require domain unit tests in CI (map §5) |

---

## 13. What comes after Phase 8

- **Phase 9:** [`flutter-phase-9-production.md`](flutter-phase-9-production.md) — v1.1 store launch, iOS App Store/TestFlight execution, Play production promotion, Crashlytics, App Check enforcement with web, Phase 7/polish if not in v1.0 binary.
- **Content:** Songs/playlists still updated via **web admin** only.

---

## 14. After Phase 8

- Maintain `versionCode` discipline per hotfix.
- Keep `assetlinks.json` in sync when rotating upload key (rare with Play App Signing).

---

*End of Phase 8 plan.*
