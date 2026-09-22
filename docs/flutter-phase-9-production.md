# Flutter Phase 9 — v1.1 launch, iOS ship & production ops

**Parent:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 9  
**Parity specs:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §9.1 v1 musician scope, §3.6–3.8, §3.12–3.13, §5–§6, §9.2–9.5  
**Errata:** [`flutter-web-app-map-verification.md`](flutter-web-app-map-verification.md) when present — production QA uses roadmap §3 defaults  
**Implementation plans:** [1](flutter-phase-1-auth.md) · [2](flutter-phase-2-library.md) · [3](flutter-phase-3-song-chart.md) · [4](flutter-phase-4-performance.md) · [5](flutter-phase-5-playlists.md) · [6](flutter-phase-6-offline.md) · [7](flutter-phase-7-groups.md) · [8](flutter-phase-8-release.md)  
**Roadmap alignment:** §0 in-scope v1/v1.1; §3 matrix; §5 routes (`/groups` v1.1); §7–§8 release; Phase 7 polish buffer; open Q Crashlytics  
**Depends on:** [Phase 8](flutter-phase-8-release.md) DoD (internal beta + [`§1.1` v1 parity matrix](flutter-phase-8-release.md) passed on release build) · [Phase 7](flutter-phase-7-groups.md) for default **1.1.0** scope · Phases **1–6** feature-complete per Phase 8 QA  
**Backend / ops:** Firebase App Check **enforcement** (with web), Play **closed → production**, App Store Connect, `song-db-5e4ed`, Vercel join + `connectivity.txt`

**Goal:** Move from **internal beta** to **store production** with the **full musician mobile client** (web consumption parity per map §9.1 + roadmap §0): v1 core already proven in Phase 8, plus default **v1.1** (groups, share-by-@username, Crashlytics, remaining P1 polish), **iOS TestFlight → App Store**, Android promotion, **App Check** with web — still **no admin/import/edit** on mobile.

**Estimate:** 2–3 person-weeks (1 FTE) + Mac calendar for iOS submission; Phase 7 may run in parallel before or during Phase 9

**Product label:** Default store version **`1.1.0+N`**; product may ship **`1.0.x` production** first only if Phase 7 is explicitly deferred (then Phase 9B/DoD groups items become a fast-follow **1.1**).

**Phase 9 does not implement Phases 1–6 from scratch** — it ships and hardens what those phases built. Missing v1 P0/P1 behavior is a **release blocker** (fix in owning phase doc, re-run Phase 8 §2), not optional Phase 9 scope creep.

---

## 0. Entry criteria (before Phase 9)

| Gate | Source |
|------|--------|
| Phase **8** DoD: internal testing AAB, QA §2 signed, CI green | [`flutter-phase-8-release.md`](flutter-phase-8-release.md) §10 |
| Beta **soak** complete (team-defined: e.g. 1–2 weeks, no open P0 crashes/blockers) | Roadmap §8 internal → closed |
| **Phase 7** DoD **or** explicit waiver (groups not in v1.1 — rare; roadmap default is v1.1 includes groups) | Roadmap §9 open Q |
| `IOS_BUILD.md` exists; Mac + Apple Developer access scheduled | Phase 8 |
| Privacy policy URL live; Play data safety accurate | Phase 8 |
| App Check providers registered on Android (and iOS if shipping) | Phase 8 §5 |
| Join API + `connectivity.txt` stable on prod host | Map §6.1, Phase 6 |
| Phase 8 **[§1.1 musician v1 matrix](flutter-phase-8-release.md)** all **Yes** rows passed on RC build | Map §9.1, roadmap §3 v1 column |
| Android **closed testing** soak (roadmap §8) before production promotion | Optional but recommended |
| `flutter analyze` + `flutter test` green; domain tests per map §5 **v1 Yes** | Phase 8 §2.8 |

---

## 1. Scope summary

### 1.0 End-state: mobile vs web (musician)

By Phase 9 **Done**, the Flutter app must deliver everything in roadmap §0 “In scope” + map §9.1 **except** web-only surfaces in map §9.2:

| Web musician capability | Mobile phase | Phase 9 verifies |
|-------------------------|--------------|------------------|
| Auth, onboarding, profile | 1 | Phase 8 §2 + production smoke §3.5 |
| Library, search, browse, filters | 2 | Same + index listener in 9G if P1 slipped |
| Song chart, transpose, numbers, live | 3 | Same |
| Performance, set navigation | 4 | Same + iOS §3.2 |
| Playlists, join API, deep links | 5, 8 | Same + prod join §3.5 |
| Offline download + connectivity UX | 6 | Same on iOS |
| Groups + group playlists | 7 | §3.1 (default v1.1) |
| Share invite + song URL | 5, 3 | `share_plus` on both platforms |
| **Never:** admin, import, edit, localStorage songs | — | §3.9 anti-patterns |

**Security (map §4.11, §9.5):** never use `profile.role` or UI for authorization; **ignore** `admin` claim for navigation; join invitees **must** use join API for `sharedWith`.

### 1.1 In scope (Phase 9 — product)

| Area | Roadmap / map | Deliverable |
|------|---------------|-------------|
| **Groups** (if not in store yet) | Phase 7, map §3.7, matrix v1.1 | Ship [`flutter-phase-7-groups.md`](flutter-phase-7-groups.md) DoD in store build |
| **Share playlist by @username** | Matrix v1.1, verification #4 | Owner `sharePlaylistByUsername` in share sheet (Phase 7G / Phase 5 unblock) |
| **Crashlytics** | Roadmap §9, §2 decision log | `firebase_crashlytics`, Flutter + native crash hooks, symbol upload |
| **P1 polish backlog** | Phases 2–3, map §3.3 | `subscribeSongIndexUpdates` on home; recent songs if incomplete; search suggestions optional; chart goldens hardening |
| **iOS ship** | Roadmap §8, §7 iOS checklist | TestFlight internal → external → App Store review (execute `IOS_BUILD.md`) |
| **Android promotion** | Roadmap §8 | Internal → closed/open → **production** (ops + product) |
| **App Check enforcement** | Map §9.5, Phase 8 prep | Enable enforcement in Firebase when **web + Android + iOS** clients validated |
| **Release notes & changelog** | Roadmap §8 versioning | `mobile/CHANGELOG.md`, Play/App Store “What’s new” |
| **Post-launch QA delta** | Phase 8 §2 + groups §2.10 | Re-run regression on **production** tracks both platforms |
| **Hotfix playbook** | Ops | `versionCode` / iOS build bump, cherry-pick, fast-track internal → closed → prod |
| **v1 P1 closure** | Matrix P1 rows | Song share, recent songs, connectivity banner, publish display, accessibility (map §3.13) — complete in 9G if missing from beta |
| **Shell nav** | Roadmap §5, map §2.2 | Home, Playlists, Profile, **Groups** tab when v1.1 shipped |
| **Group invite by @username** | Phase 7, map §3.7 | Owner `inviteGroupMemberByUsername` on group detail |

### 1.2 In scope (Phase 9 — ops / engineering)

| Area | Deliverable |
|------|-------------|
| **Monitoring** | Crashlytics dashboards; optional Firebase Performance (defer if not needed) |
| **App Check debug tokens** | Document rotation for dev team; CI emulator tokens if used |
| **Universal Links / App Links** | iOS AASA + Android asset links verified on **production** builds |
| **Store assets** | iOS screenshots (6.7", etc.), Play feature graphic if going public |
| **Feedback loop** | Internal tester → Play/App Store review notes template |
| **Join API reliability** | Document Vercel SLA; **spike only** for Cloud Function duplicate (map §9.4) — implementation optional later |
| **Play data safety / App Privacy** | Update declarations when Crashlytics collects crash logs |
| **CI** | Optional `macos-latest` `flutter build ipa` on release tags (Phase 0 step 13) |
| **Same git tag** | One tag builds Android AAB + iOS IPA with identical `JOIN_API_BASE_URL` |

### 1.3 Out of scope (Phase 9)

| Item | Note |
|------|------|
| Admin, import, composer, song edit | Map §9.2, §3.9–3.11 — **web only / v2** |
| `chordProParser` / mobile authoring | Map §5 Defer |
| Guest `localStorage` songs | Never |
| Replacing Vercel join API (full migration) | Optional future; Phase 9 = document + spike at most |
| SQLite/isar index at 10k scale | Map §9.5 risk — monitor; separate initiative if needed |
| macOS CI for every PR | Optional nightly iOS build only |
| Using `users.role == admin` in client | Map §4.11 — **forbidden**; admin is token claim on web only |
| Reading/writing `meta/*` for product features | Map §9.5 TBD — not required for musician v1 |

### 1.4 Mobile vs web (production)

| Topic | Web | Flutter Phase 9 |
|-------|-----|-----------------|
| Distribution | Vercel PWA | Play Store + App Store production |
| Groups | Yes | v1.1 mobile parity |
| App Check | reCAPTCHA optional → enforce together | Play Integrity + App Attest enforced together |
| Content updates | Admin web | Mobile read-only |

---

## 2. v1.1 feature gate (roadmap matrix — v1.1 column)

Ship all items product committed to for **1.1.0** (default = roadmap defaults).

| Feature | Phase owner | Phase 9 check |
|---------|-------------|---------------|
| Groups list / join / group playlists | 7 | §3 QA |
| Share by @username | 7 / 5 | Share sheet username block |
| Crashlytics | 9 | Non-fatal + fatals in console |
| Recent songs polish | 2 | Home section if still P1-incomplete |
| Live index listener | 2 | `subscribeSongIndexUpdates` debounced refresh |
| Golden tests | 3 / 7 | CI optional gate |

**Still deferred (v2 / never):** admin dashboard, import, edit, `songEdits`, mobile parsers for authoring.

### 2.1 v1 P1 completion gate (before public production)

Roadmap §3 / map: these are **v1 Yes** (often P1). Must pass on store RC or be explicitly waived:

| Item | Source | Owner |
|------|--------|-------|
| Recent songs (max 10) | `recentSongs.ts` | Phase 2 / 9G |
| Song share URL | map §3.4, §9.1 | Phase 3 / 9G |
| Connectivity banner + probe | map §3.12, verification #8 | Phase 6 |
| Publish status display | map §3.6 | Phase 5 |
| Accessibility on performance + offline banner | map §3.13 | 9G |
| Live index listener (admin rebuild) | map §3.3 P1 | 9G |
| `PUBLISHED_PLAYLIST_CAP` (**100**) in list merge | map §1 constants | Phase 5 smoke |

---

## 3. QA checklist (delta on Phase 8)

**Mandatory:** Re-run full [Phase 8 §2](flutter-phase-8-release.md) on **store candidate** builds (Android AAB + iOS IPA), including §1.1 matrix and §2.9 security checks.

Then add:

### 3.1 Groups & collaboration (Phase 7 — [`§8` DoD](flutter-phase-7-groups.md))

- [ ] `/groups` requires auth + **username** gate (map: playlists/groups need auth).
- [ ] Create group; join **8-char** code (uppercase trim); idempotent re-join.
- [ ] Group detail: members, invite code copy; **owner** invite member by @username.
- [ ] Non-member cannot read group detail (permission error, not empty shell).
- [ ] Group playlist create (`groupId`); members open in Phase 5 detail; owner/group owner delete rules.
- [ ] Owner **delete group** → cascades invite doc + group playlists.
- [ ] Home: group playlist previews (**flatten → max 2 cards** total per Phase 7).
- [ ] Share playlist to @username (owner only); recipient sees shared playlist.
- [ ] Two-account manual test per Phase 7 §7.

### 3.2 iOS-specific (roadmap §7)

- [ ] Google Sign-In iOS client + URL scheme.
- [ ] Universal Link: join + song URLs open app.
- [ ] Safe area: notch, home indicator, performance bar.
- [ ] Wakelock + autoscroll on iOS.
- [ ] TestFlight install from external tester account.

### 3.3 Crashlytics

- [ ] Force test crash in internal build only; event appears in Firebase console.
- [ ] Release build symbols uploaded (Android mapping / iOS dSYM).

### 3.4 App Check (pre-enforcement)

- [ ] Debug build: App Check token attaches to Firestore requests.
- [ ] Release Android: Play Integrity passes.
- [ ] Release iOS: App Attest passes.
- [ ] **Enforcement:** staged enable (see §5) — verify web still works.

### 3.5 Production smoke

- [ ] Fresh install from Play/App Store (not sideload): login, browse, song, playlist join link, offline download.
- [ ] **Guest** can still browse library + open song (roadmap default guest read).
- [ ] Deep links on **production** signing: join + song URLs (Android App Links + iOS Universal Links).
- [ ] `POST /api/playlists/join` on prod host with release `JOIN_API_BASE_URL`.
- [ ] Version displayed in profile or about (optional P2).

### 3.6 Accessibility & theme (map §3.13)

- [ ] Semantics / labels on performance controls (autoscroll, nav, theme).
- [ ] Offline banner exposed as status (web `role="status"` parity).
- [ ] Light/dark/stage theme readable on stage (roadmap §2 theming).

### 3.7 Auth & navigation gates

- [ ] Logged-out user hitting `/playlists`, `/groups`, `/profile` → login with sensible `next`.
- [ ] No `/admin`, `/import`, or edit routes in `go_router` (roadmap §5).

### 3.8 v1 P1 items (§2.1)

- [ ] Checklist §2.1 rows verified or product-waived in writing.

### 3.9 Security anti-patterns (repeat Phase 8 §2.9)

- [ ] No song/index/songEdits writes; no bypass of join API for `sharedWith`.

---

## 4. Android production promotion

| Step | Action |
|------|--------|
| 1 | Bump `pubspec` to `1.1.0+N` (or `1.0.x` if groups deferred); changelog |
| 2 | Promote from Phase 8 **internal** → **closed testing** (roadmap §8) → church validation |
| 3 | Promote to **open testing** or **production** per product |
| 4 | Play Console: update screenshots, “What’s new”, countries; **data safety** if Crashlytics on |
| 5 | Monitor Crashlytics + Play vitals (ANR, crashes) first 72h |
| 6 | Confirm `assetlinks.json` SHA still matches Play **app signing** cert after promotion |

Roadmap §8: `versionCode` strictly increasing per upload.

### 4.1 Hotfix playbook (production)

1. Branch from release tag; fix; bump `version` + `versionCode` / iOS build number.  
2. `flutter build appbundle --release` + iOS archive with same `--dart-define=JOIN_API_BASE_URL=...`.  
3. Upload to **internal** first; smoke §3.5; promote track.  
4. Post-mortem in changelog; optional Crashlytics non-fatal breadcrumb for known issues (no PII).

---

## 5. iOS production path

Execute `mobile/IOS_BUILD.md` (created in Phase 8).

| Step | Action |
|------|--------|
| 1 | Archive release with prod `JOIN_API_BASE_URL` |
| 2 | TestFlight **internal** (team) |
| 3 | TestFlight **external** (beta testers, compliance export if needed) |
| 4 | App Store submission: privacy nutrition labels, encryption export compliance |
| 5 | Associated Domains + `apple-app-site-association` on Vercel (same host as join/probe) |
| 6 | Firebase iOS app, `GoogleService-Info.plist`, App Check **App Attest** |
| 7 | Privacy usage strings (camera/mic unused → declare none); Sign in with Apple only if product adds Apple auth (web uses Google/email) |
| 8 | Register iOS URL scheme for Google Sign-In (`REVERSED_CLIENT_ID`) |

**Risk (roadmap Phase 8):** plan **1 week Mac access** before public iOS date.

---

## 6. App Check coordinated enforcement

| Stage | Action |
|-------|--------|
| A | All clients send App Check tokens in **monitoring** mode (Firebase console metrics) |
| B | Fix clients with high failure rate (wrong provider, debug builds) |
| C | Enable **Firestore** (and **Auth** if console recommends) enforcement during low-traffic window with web team |
| D | Rollback plan: disable enforcement if legitimate users blocked |

Web: `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY` / Enterprise reCAPTCHA (map §8).  
Mobile: `firebase_app_check` integrated in Phase 8; Phase 9 flips enforcement in Firebase console (not client-only).  
**Pre-check:** web PWA and mobile beta builds show healthy App Check metrics for ≥48h.

---

## 7. Crashlytics integration

```yaml
# pubspec (roadmap Appendix A)
dependencies:
  firebase_crashlytics: ^4.x  # align with firebase_core major
```

| Task | Detail |
|------|--------|
| Init | After `Firebase.initializeApp` |
| Flutter errors | `FlutterError.onError` + `PlatformDispatcher.instance.onError` |
| Android | Upload mapping.txt with Play bundle |
| iOS | dSYM upload via Xcode / CI |
| PII | No chord text or emails in custom logs |

Default roadmap decision: **v1.1 yes**, v1.0 beta no (Phase 8 optional).

---

## 8. Optional ops spike (join API)

Map §9.4: duplicate `POST /api/playlists/join` as Cloud Function.

| Phase 9 | Outcome |
|---------|---------|
| Spike (≤2 days) | RFC: auth, token normalize, Admin SDK write, env secrets |
| Ship | **Not required** for v1.1 if Vercel route stable |

Mobile client unchanged if URL path + contract identical.

---

## 9. Sub-phases (implementation order)

### Phase 9A — Release planning (1–2 days)

- [ ] Confirm v1.1 scope (groups yes/no, polish list).
- [ ] Version `1.1.0`; changelog; store copy.

### Phase 9B — Phase 7 merge (if needed) (0–2 pw)

- [ ] Complete [Phase 7 §8 DoD](flutter-phase-7-groups.md) (7A–7F minimum; 7G polish).
- [ ] Enable Groups shell tab; `sharePlaylistByUsername` + group username invite.

### Phase 9C — Crashlytics & monitoring (2–3 days)

- [ ] SDK, symbols, test crash internal only.

### Phase 9D — iOS TestFlight (3–5 days on Mac)

- [ ] Build, upload, external testers, §3.2 QA.

### Phase 9E — Android promotion (1–2 days)

- [ ] Closed → production path; vitals watch.

### Phase 9F — App Check enforcement (1–2 days, coordinated)

- [ ] Monitoring → enforce with web; §6 rollback ready.

### Phase 9G — P1 polish (parallel, 2–4 days)

- [ ] §2.1 items: index listener, recent songs, song share, connectivity, publish label, accessibility, goldens.

### Phase 9H — Production sign-off (1–2 days)

- [ ] §3 full pass; roadmap Phase 9 + progress table updated.

---

## 10. Definition of done (Phase 9)

- [ ] **Android:** app available on **production** track (or approved open beta) at `1.1.x`.
- [ ] **iOS:** App Store **approved** or TestFlight external with product sign-off for “soft launch”.
- [ ] **v1.1 features:** groups + share-by-username (if in scope) verified on both platforms.
- [ ] **Crashlytics** receiving release crashes (zero test crashes in prod builds).
- [ ] **App Check** enforced or dated enforcement with web (documented exception).
- [ ] Phase 8 **full** §2 + §1.1 matrix on production RC; §3 delta signed off.
- [ ] §2.1 v1 P1 items done or waived; §1.0 musician table satisfied for shipped version.
- [ ] [`flutter-roadmap.md`](flutter-roadmap.md) progress: Phase 9 complete.

---

## 11. Roadmap & map traceability

| Source | Section |
|--------|---------|
| Roadmap §8 production / iOS 1–2 pw | §4, §5 |
| Roadmap §9 Crashlytics v1.1 | §7 |
| Roadmap timeline post-8 / Phase 7 v1.1 | §0, §1 |
| Matrix v1.1 column | §2 |
| Map §3.7 groups | §3.1 |
| Map §9.2 defer v1 | §1.3 |
| Map §9.4 join API future | §8 |
| Map §9.5 App Check, join host, 10k index, role vs claim | §1.0, §6, §8, §12 |
| Map §9.1 v1 musician scope | §1.0, §2.1, §3.5 |
| Map §3.12–3.13 offline + a11y | §2.1, §3.6 |
| Map §7 musician can/cannot | §1.0, §3.9 |
| Map §6.1 join API | §3.5, §8 |
| Roadmap §0 in-scope list | §1.0 |
| Phase 8 §1.1 v1 matrix | §0, §3 (mandatory re-run) |
| Phase 7 §8 DoD | §3.1, §9B |
| Phase 8 handoff | §0, §3 |
| Appendix issues 16, 18, 19–20 | §1, §4, §5, §4.1 |

---

## 12. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| App Check blocks real users | Staged enforce; monitor; rollback |
| iOS review rejection | Privacy strings, account deletion policy if required |
| v1.1 scope creep (admin) | §1.3; product gate in 9A |
| Groups rule violations | Phase 7 `isGroupJoinUpdate` parity |
| Join API outage | Status page; optional Function later |
| Index stale after admin publish | Ship 9G index listener |
| Two store versions diverge | Same git tag for both platform artifacts |
| v1 beta shipped without P1 polish | §2.1 gate before production |
| `profile.role` mistaken for admin | §1.0 security note; code review |
| Published playlist list wrong | Verify `PUBLISHED_PLAYLIST_CAP` merge in Phase 5 |
| iOS universal links fail on prod | AASA + entitlements on release bundle |

---

## 13. What comes after Phase 9

| Item | Track |
|------|--------|
| **v2 mobile admin** | Map P2 — separate roadmap if ever |
| **Mobile authoring** | Parser ports §5 Defer |
| **Join API on Cloud Functions** | Ops §8 spike follow-up |
| **Isar/SQLite index** | Performance at 10k+ |
| **Ongoing releases** | Hotfix via Phase 9 playbook; feature phases TBD |

---

## 14. After Phase 9

- Maintain parity when web changes Firestore shapes (monorepo PRs).
- Re-run Phase 8 QA subset for each store release.
- Annual certificate / signing key audit.

---

*End of Phase 9 plan.*
