# Flutter Phase 1 — Auth, onboarding, routing shell, theme

**Parent:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 1  
**Parity specs:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.1, §3.2, §3.8, routes §2 · [`flutter-web-app-map-verification.md`](flutter-web-app-map-verification.md) (if auth/join errata added later, they override the map)  
**Roadmap alignment:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 1 user stories + screen map §5 (auth routes, shell, no admin)  
**Backend:** Firebase project **`song-db-5e4ed`** — same Auth + Firestore `users` / `usernames` as web (`firestore.rules`)  
**Prerequisite:** Phase 0 complete (`mobile/`, `firebase_core`, `firebase_options.dart`)

**Mobile route constants (not web paths):**

| Constant | Value | Web equivalent |
|----------|--------|----------------|
| `MOBILE_HOME_PATH` | `/home` | `/` |
| `USERNAME_ONBOARDING_PATH` | `/onboarding/username` | same |
| `LOGIN_PATH` | `/login` | same |

**Goal:** Musicians can sign up, sign in (email + Google), claim a username when needed, and land in a **mobile app shell** (bottom nav) with light/dark theme — **same data and rules as web**, no admin surfaces.

**Estimate:** 1.5–2 person-weeks (1 FTE)

---

## 1. Scope summary

### In scope (Phase 1)

| Area | Web reference | Flutter deliverable |
|------|---------------|---------------------|
| Email/password sign-in | `AuthProvider.signIn`, `LoginForm` | Login screen + repository |
| Email/password sign-up + username | `signUp`, `createUserProfile`, rollback `deleteUser` | Signup screen |
| Google Sign-In | `signInWithRedirect` + `googleAuth.ts` | **`google_sign_in` + `signInWithCredential`** (native flow) |
| Auth state + profile load | `onAuthStateChanged`, `getUserProfile`, `touchLastLogin` | Riverpod `authStateProvider` + profile stream/doc |
| Legacy profile create | `ensureLegacyUserProfile` (Google / old users) | Same fields as `validLegacyUserCreate()` in rules |
| Username onboarding | `UsernameGate`, `/onboarding/username` | Router redirect + onboarding screen |
| Safe `next` redirect | `safeRedirect.ts` | Query param `next` on login/signup/join (path-only) |
| Post-auth routing | `resolvePostAuthDestination` | **Mobile:** never `/admin`; default **`/home`** |
| Auth error messages | `authErrors.ts` | Port `formatAuthError` |
| Username validation | `validation.ts` (`USERNAME_REGEX`) | Port to `domain/validation.dart` |
| Username claim | `users.claimUsername` batch | Same batch shape for rules |
| Sign-out | → `/login` | → `/login`, clear nav stack |
| App shell | `AppShell` + `sidebarNav` (musician tabs) | **Bottom navigation:** Home, Playlists, Profile (Groups tab stub → Phase 7) |
| Theme | `theme.ts` (`lf-theme` light/dark) | `ThemeMode` + `shared_preferences` key `lf-theme` |
| Firestore init | `firebase.ts` persistence | `cloud_firestore` with default **offline persistence** enabled |
| Profile | `/profile` | Display name edit, @username display, theme toggle, sign out (port `profile/page.tsx` musician paths) |
| Join invite landing (stub) | `/join/p/:token` | **UI + auth gating only** — “Sign in to join” with `next=`; API call in Phase 5 |
| Bootstrap / splash | `/` | Redirect to `/home` after auth bootstrap (or show loading while `profileResolved`) |
| Google account picker | `googleAuth.ts` `prompt: select_account` | `GoogleSignIn` — prefer account selection when supported |
| Global auth error surface | `AuthProvider.authError` + `clearAuthError` | Expose on controller; login reads once like web |

### Out of scope (Phase 1)

| Item | Reason |
|------|--------|
| Admin dashboard / `isAdmin` navigation | Mobile musician app — **ignore `admin` claim for routing** (map §3.1, roadmap) |
| Demo accounts (`NEXT_PUBLIC_DEMO_LOGIN`) | Optional later via `--dart-define=DEMO_LOGIN=true` |
| App Check enforcement | Plan only; match web before enforce |
| Song library, playlists data, join API **`POST`** | Phase 2–5 (`joinPlaylistByInviteToken` → Phase 5) |
| `meta/*` reads beyond auth smoke | Not needed for Phase 1 |
| Guest `localStorage` songs | Never on mobile |
| Password reset / “forgot password” | Web has **no** reset flow — do not add unless product asks |
| Admin role label / `/admin` in `next` | Mobile rejects web-only paths in `next` (see §2.5) |

### Mobile vs web (intentional differences)

| Topic | Web | Flutter Phase 1 |
|-------|-----|-----------------|
| Google auth | `signInWithRedirect`, `authRedirect` sessionStorage | One-tap `GoogleSignIn` → Firebase credential; no redirect overlay |
| Default landing after auth | `/` or `/admin` | **`/home`** (library placeholder) |
| `next` query | Same-origin path only | Same rules: must start with `/`, not `//`, not onboarding path |
| Navigation chrome | Sidebar + mobile header | **Bottom nav** + `AppBar` per tab |
| Playlists / groups tabs | Full pages | **Empty state** (“Coming in Phase 5/7”) but routes exist for guards |

---

## 2. Web behavior checklist (must match)

Source of truth: `webmvp/src/components/AuthProvider.tsx`, `webmvp/src/lib/firestore/users.ts`, `webmvp/src/lib/safeRedirect.ts`.

### 2.1 On every auth state change (signed in)

1. If **not** in the middle of email `signUp` batch: call **`ensureLegacyUserProfile`** when `users/{uid}` missing (legacy create: email, displayName, role `musician`, avatarInitials, createdAt, lastLoginAt — **no username**).
2. **`touchLastLogin(uid)`** if profile doc exists.
3. Load **`getUserProfile(uid)`**.
4. Set **`needsUsernameOnboarding`** = `profile != null && !profile.username` (if profile is **null** after errors, **false** — same as web; do not trap user on onboarding).
5. **Do not** use `profile.role` for security; **do not** expose admin UI or **Administrator** label (web profile shows it via `isAdmin`; mobile always **Musician**).
6. Optional parity with web boot: call **`initAppCheck()`** stub when adding `firebase_app_check` — **do not enforce** in console until coordinated.

### 2.2 Email sign-up

1. Validate display name non-empty.
2. `validateUsername` → normalized lower case.
3. `isUsernameAvailable(normalized)` via `usernames/{normalized}` get.
4. `createUserWithEmailAndPassword`.
5. `updateProfile(displayName)` on Auth user.
6. `createUserProfile` — **write batch**: `users/{uid}` + `usernames/{lower}` (fields per `validUserCreate()` in rules).
7. On any failure after Auth user created: **`deleteUser`** (best effort).
8. Skip `ensureLegacyUserProfile` during sign-up (`signUpInProgress` flag on web).

### 2.3 Google sign-in

1. Use native sign-in → `GoogleAuthProvider.credential` → `signInWithCredential` (replaces web `signInWithRedirect` / `authRedirect.ts` — **no** sessionStorage pending flag; use local `isGoogleSigningIn` for button loading only).
2. Prefer **`prompt: select_account`** behavior (web `createGoogleAuthProvider`).
3. After credential: auth listener runs legacy ensure + touch + profile load.
4. If profile loaded and no `username` → onboarding (same as web).

### 2.4 Username onboarding

1. Requires signed-in user; else redirect to `/login?next=...`.
2. If profile already has `username` → `resolvePostAuthPath(next, false)` → **`/home`** on mobile.
3. `claimUsername`: validate, check available, batch update user + create `usernames` doc (`validUsernameClaim()`).
4. Pre-fill suggestion: port **`suggestUsername(email, displayName)`**.
5. “Use a different account” → **sign out** → login.

### 2.5 Safe redirect

Port web logic from `safeRedirect.ts` + tests in `safeRedirect.test.ts`, with mobile path constants:

- `getSafeRedirectPath(next)` — reject `null`, paths not starting with `/`, `//`, paths starting with `/onboarding/username`, and **mobile-only** web-only prefixes: `/admin`, `/import`, `/song/` segments containing `/edit` (musician app must not deep-link into admin tooling).
- `resolvePostAuthDestination(next, isAdmin, profile)` — if `profile != null` and no `username`, go to onboarding with preserved `next` (query-encoded). If **`profile == null`**, do **not** send to onboarding; honour `next` or default home (web tests: `resolvePostAuthDestination('/playlists/abc', false, null)` → `/playlists/abc`).
- **Mobile `resolvePostAuthPath(next, _isAdmin)`:** always treat as musician — if `next` set use it; else **`MOBILE_HOME_PATH`** (`/home`). **Never** `/admin`.
- Port **`resolvePostAuthDestinationForUser`** for post-login navigation: load profile + use `isAdmin: false` for destination (ignore admin claim for routing).
- Allow safe paths such as **`/join/p/{token}`** (required for invite flow; web `join/p/[token]/page.tsx`).

### 2.6 Auth errors

Port all cases in `authErrors.ts`; add mobile-specific if needed:

- `auth/popup-*` → less relevant; map Google plugin cancel to “Sign-in was cancelled.”
- Add **`auth/weak-password`** → friendly message (Firebase signup; web relies on HTML `minLength={6}`).

### 2.7 Profile (musician parity)

Port `app/(app)/profile/page.tsx` **except** admin role label:

- Show email, **editable display name** (`updateUserDisplayName` + Auth `updateProfile`), save success/error messages.
- Show **`@username`** when set; if missing, inline claim form (same `claimUsername` as onboarding — usually unreachable while `UsernameGate` works, but keeps parity).
- **Theme toggle** light/dark (`readAppTheme` / `writeAppTheme` → `shared_preferences` `lf-theme`) — on profile like web.
- Sign out.
- Guests: profile route redirects to login (roadmap: profile requires auth); web allows read-only “Sign in” copy — mobile may redirect earlier via router.

### 2.8 Sign-up / form validation (UI)

| Field | Rule | Web reference |
|-------|------|----------------|
| Display name | Required, trimmed | `SignupForm`, `signUp` |
| Username | `validateUsername` + async availability | `checkUsernameAvailable` |
| Email | Required | Firebase |
| Password | **`minLength` 6** (HTML); enforce in Flutter form | `SignupForm` `minLength={6}` |

### 2.9 Username gate vs guest (critical — match web)

Web `(app)/layout` → **`UsernameGate`** wraps **all** shell routes including **home `/`**.

| User state | `/home` (library shell) | `/playlists`, `/profile` |
|------------|-------------------------|---------------------------|
| **Guest** (no Firebase user) | Allowed | Login required (`next=`) |
| **Signed in, no username** | **Blocked** → onboarding | **Blocked** → onboarding |
| **Signed in, has username** | Allowed | Allowed |

Do **not** let signed-in users without a username browse `/home` while skipping onboarding — that would diverge from web.

### 2.10 Join invite route (Phase 1 stub)

Match `join/p/[token]/page.tsx` **until Phase 5**:

1. **Outside** `AppShell` (no bottom nav).
2. Invalid/missing token → error copy.
3. Not signed in → “Sign in to join” + links to `/login?next=/join/p/{token}` and signup with same `next`.
4. Signed in → Phase 1: show “Join will be enabled in a later update” **or** placeholder loading state; Phase 5 wires `joinPlaylistByInviteToken` + `POST /api/playlists/join` then `go('/playlists/{sessionId}')`.
5. After auth from invite, `resolvePostAuthDestination` must return onboarding first if username missing, else honour `next` back to join route.

### 2.11 Edge cases & failure modes

| Case | Expected behavior |
|------|-------------------|
| Profile Firestore read fails | `profile = null`, `needsUsernameOnboarding = false`, `profileResolved = true`; user can still use guest paths; signed-in user may see error snackbar and retry |
| `createUserProfile` fails after Auth user created | `deleteUser` (best effort), show `formatAuthError` |
| Username taken at signup | Error before Auth create (availability check); race: batch commit fails → show “already taken” |
| `claimUsername` when username already set | Error “Username is already set” (rules + client) |
| `touchLastLogin` when doc missing | No-op (web); runs after `ensureLegacyUserProfile` |
| Legacy `setDoc` | Must satisfy `validLegacyUserCreate()` — **no `username` field** on create |
| Sign out | Clear profile state; navigate to `/login`; Firebase Auth persistence cleared |

---

## 3. Firestore & Auth data model

Same collections as web (map §4, rules `users` / `usernames`).

### `users/{uid}` (read: owner only)

| Field | Sign-up create | Legacy create | Claim username |
|-------|----------------|---------------|----------------|
| `email` | ✓ | ✓ | unchanged |
| `displayName` | ✓ | ✓ | unchanged |
| `username` / `usernameLower` | ✓ (equal, lower) | absent | set together |
| `role` | `"musician"` | `"musician"` | unchanged |
| `avatarInitials` | ✓ | ✓ | unchanged |
| `createdAt` | server timestamp | server timestamp | unchanged |
| `lastLoginAt` | server timestamp | server timestamp | updated on login |

### `usernames/{usernameLower}`

| Field | On create |
|-------|-----------|
| `uid` | auth uid |
| `usernameLower` | doc id |
| `createdAt` | server timestamp |

**Rules highlights:** user cannot change `role`; username claim only when `username` not already on profile; `usernames` create-only (no update/delete).

---

## 4. Manual & console setup (do before Google works)

### 4.1 Firebase Console (`song-db-5e4ed`)

| Step | Action |
|------|--------|
| 1 | **Authentication → Sign-in method:** enable **Email/Password** and **Google** (same as web). |
| 2 | **Authentication → Settings → Authorized domains:** mobile uses native Google + Firebase SDK — no web domain needed for the app binary; web domains stay for Next.js. |
| 3 | Confirm Android/iOS apps registered (FlutterFire already added `com.lfchords.lf_chords` Android; iOS `com.lfchords.lfChords`). |

### 4.2 Android — Google Sign-In (required for debug + release)

| Step | Action |
|------|--------|
| 1 | Get **SHA-1** and **SHA-256** of the keystore you use to run the app: |
| | Debug: `cd mobile/android && ./gradlew signingReport` (Windows: `gradlew.bat signingReport`) |
| 2 | Firebase **Project settings → Your apps → Android app** → add SHA-1 and SHA-256. |
| 3 | Download fresh **`google-services.json`** → `mobile/android/app/google-services.json`. |
| 4 | If sign-in fails with `10:` / `12500` / `developer_error`, SHA mismatch is the usual cause. |

**Release:** Before Play Store, add **Play App Signing** certificate SHA-1/256 to Firebase as well.

### 4.3 iOS — Google Sign-In (Mac week)

| Step | Action |
|------|--------|
| 1 | Ensure `GoogleService-Info.plist` from FlutterFire is in `ios/Runner`. |
| 2 | Add **URL scheme** `REVERSED_CLIENT_ID` from plist to `Info.plist` (FlutterFire / Firebase iOS docs). |
| 3 | Xcode: enable Google sign-in capability if prompted. |

### 4.4 `google_sign_in` + Firebase Auth wiring

| Step | Action |
|------|--------|
| 1 | Use **web client ID** from Firebase Console (OAuth 2.0 **Web client**, auto-created for Firebase) as `serverClientId` on Android when using `GoogleSignIn` + `GoogleAuthProvider.credential` — required for Firebase to receive id token. |
| 2 | Document the ID in `mobile/README.md` as “from Firebase Console → Authentication → Google → Web SDK configuration” (not a secret, but don’t commit unrelated OAuth secrets). |

### 4.5 No manual Firestore index for Phase 1

Username availability is **get** by doc id only; user profile is **get** by uid.

### 4.6 Optional: App Check

Register Play Integrity (Android) / App Attest (iOS) in console; **do not enforce** until coordinated with web (`roadmap` Phase 0 step 10).

---

## 5. Dependencies (`pubspec.yaml`)

Add in Phase 1 (versions align with `firebase_core` ^4.x — run `flutter pub upgrade` and fix breaks):

```yaml
dependencies:
  firebase_auth:        # email + Google credential
  cloud_firestore:      # users, usernames; offline persistence
  google_sign_in:       # native Google
  flutter_riverpod:     # auth + theme state
  go_router:            # guards, deep links prep
  shared_preferences:   # lf-theme
```

**Dev:** `mockito` or `fake_firebase_*` optional for repository unit tests.

After `cloud_firestore` is added, enable persistence once at startup (mobile default is on; explicit settings only if you need cache size tuning later).

---

## 6. Architecture (Flutter)

### 6.1 Folder layout (Phase 1 target)

```
mobile/lib/
  main.dart
  app.dart                          # ProviderScope + MaterialApp.router
  firebase_options.dart
  core/
    firebase/
      firebase_bootstrap.dart       # init Firebase + Firestore settings
    routing/
      app_router.dart               # go_router + redirects
      route_paths.dart
    theme/
      app_theme.dart                # M3 light/dark from LF tokens
      theme_controller.dart         # read/write lf-theme
  domain/
    validation.dart                 # port validation.ts (username only in P1)
    auth_errors.dart
    safe_redirect.dart
    username_suggestions.dart
    user_display.dart
  data/
    models/user_profile.dart
    repositories/
      auth_repository.dart          # Firebase Auth wrappers
      user_repository.dart          # port users.ts
  features/
    auth/
      login_screen.dart
      signup_screen.dart
      widgets/...
    onboarding/
      username_onboarding_screen.dart
    shell/
      app_shell.dart                # Scaffold + NavigationBar
      placeholder_tab_screen.dart
    profile/
      profile_screen.dart
    join/
      join_playlist_screen.dart     # stub until Phase 5
  providers/
    auth_providers.dart
```

### 6.2 Riverpod providers (sketch)

| Provider | Responsibility |
|----------|----------------|
| `firebaseAuthProvider` | `FirebaseAuth.instance` |
| `authStateChangesProvider` | `Stream<User?>` |
| `authControllerProvider` | signIn, signUp, signOut, google, errors |
| `userProfileProvider` | `AsyncValue<UserProfile?>` keyed by uid |
| `needsUsernameOnboardingProvider` | derived from profile |
| `themeModeProvider` | `ThemeMode` from prefs |

Auth listener logic (legacy ensure, touch, profile) lives in **`authController`** or a dedicated **`authLifecycleProvider`** — mirror web `useEffect` block once, not per screen.

### 6.3 `go_router` structure

| Route | Name | Auth | Notes |
|-------|------|------|-------|
| `/login` | login | Public | `?next=` |
| `/signup` | signup | Public | `?next=` |
| `/onboarding/username` | onboarding | Signed in | `?next=`; outside shell |
| `/home` | home | Public* | Shell child; *guest OK (Phase 2 content) |
| `/playlists` | playlists | **Redirect login** | Placeholder |
| `/profile` | profile | **Redirect login** | Stub |
| `/` | bootstrap | Public | Redirect → `/home` when idle |
| `/join/p/:token` | join | Public → login if needed | **No shell**; stub UI §2.10 |

**Shell routes** (wrapped in `AppShell` + username gate): `/home`, `/playlists`, `/profile`.

**Redirect rules (global):**

1. **Bootstrap:** while `authState.loading || (user != null && !profileResolved)` → splash/loading route or overlay (roadmap “Splash / bootstrap”).
2. **Username gate:** signed in + `needsUsernameOnboarding` + route is a **shell** route + not on onboarding → `/onboarding/username?next=...` (encode full path if `getSafeRedirectPath` allows).
3. **Protected tabs:** `/playlists`, `/profile` → if no user → `/login?next=<encoded>`.
4. **Auth screens:** if signed in + profile resolved + has username → redirect away to `resolvePostAuthDestination` (mobile `isAdmin: false`).
5. **Guest on `/home`:** allowed without login (matches web guest library access inside shell).

Use `refreshListenable` / `GoRouterRefreshStream` on auth + profile streams.

**Phase 2 prep (not implemented in Phase 1):** register `/song/:id` as public shell or stack route — document in router file TODO.

### 6.4 Theme shell

| Item | Web | Flutter |
|------|-----|---------|
| Storage key | `lf-theme` | same key in `shared_preferences` |
| Values | `light` \| `dark` | `ThemeMode.light` \| `ThemeMode.dark` |
| Stage theme | performance (later) | defer to Phase 4 |
| Colors | CSS `--lf-*` | Port primary neutrals from web design tokens into `ColorScheme` (dark bg ~ `#171717` seed already in `main.dart`) |

Shell UI:

- **NavigationBar** with 3 destinations: Home, Playlists, Profile (icons aligned with web sidebar semantics).
- Signed-out users can open **Home** (browse later); tapping Playlists/Profile prompts login.
- AppBar title from route (port `resolveMobilePageTitle` idea without admin/import).

---

## 7. Sub-phases (implementation order)

### Phase 1A — Foundation (1–2 days)

- [ ] Add packages; `firebase_bootstrap.dart` with Firestore persistence.
- [ ] `UserProfile` model + JSON/Firestore field mapping (Timestamps).
- [ ] Port `validation.dart`, `auth_errors.dart`, `safe_redirect.dart`, `user_display.dart`, `username_suggestions.dart`.
- [ ] Unit tests for validation + safe_redirect (copy cases from `safeRedirect.test.ts`, `authErrors.test.ts`).

### Phase 1B — User repository (2–3 days)

- [ ] Port `user_repository.dart`: `isUsernameAvailable`, `getUserProfile`, `createUserProfile`, `claimUsername`, `touchLastLogin`, `updateUserDisplayName`, `ensureLegacyUserProfile`.
- [ ] Integration test optional: Firestore emulator + rules (same as web integration tests).

### Phase 1C — Auth repository + controller (2–3 days)

- [ ] Email sign-in / sign-up / sign-out.
- [ ] Sign-up rollback `deleteUser` on profile failure.
- [ ] Google: `GoogleSignIn` → `GoogleAuthProvider.credential` → `signInWithCredential`.
- [ ] Auth state listener: legacy ensure, touch, profile load, `needsUsernameOnboarding`.
- [ ] `signUpInProgress` guard to skip legacy ensure during signup batch.

### Phase 1D — Screens (2–3 days)

- [ ] Login: email/password, Google button, link to signup, “Browse without signing in” → `/home`, error display, loading.
- [ ] Signup: display name, username (async availability), email, password, Google, link to login.
- [ ] Onboarding: username field with `@`, suggestion, claim, sign out link.
- [ ] Wire `next` on all auth flows.
- [ ] Join stub screen: invalid token, signed-out CTA, signed-in placeholder (§2.10).
- [ ] Reuse `AuthDivider` / Google button loading patterns from web forms.

### Phase 1E — Router + shell (2–3 days)

- [ ] Replace `MaterialApp(home:)` with `MaterialApp.router` + `go_router`.
- [ ] Implement redirects (§6.3).
- [ ] `AppShell` with bottom nav; placeholder bodies for Home / Playlists / Profile.
- [ ] Remove or relocate Phase 0 `HomeShell` debug text to a **debug footer** in profile or `kDebugMode` only.

### Phase 1F — Theme + profile (1–2 days)

- [ ] Theme controller + toggle on **profile** (match web `profile/page.tsx`).
- [ ] Profile: email, edit display name + save, @username or inline claim, sign out (§2.7).

### Phase 1G — Manual verification & docs (1 day)

- [ ] Complete §4 Android SHA steps on each dev machine.
- [ ] `mobile/README.md`: clone, `flutter run`, Google SHA, `JOIN_API_BASE_URL` define (for later).
- [ ] Widget tests: login form validation smoke; router redirect unit tests where possible.

---

## 8. Testing plan

| Layer | What |
|-------|------|
| Unit | `validateUsername`, `getSafeRedirectPath` (incl. `/admin` reject + `/join/p/x` allow), `resolvePostAuthDestination` (profile null vs no username — port `safeRedirect.test.ts` with `/home`), `resolvePostAuthPath(null, false)` → `/home`, `formatAuthError`, `suggestUsername`, `userInitials` |
| Unit | `UserRepository` with mocked `FirebaseFirestore` / fake_cloud_firestore |
| Widget | Pump login/signup with overridden `authControllerProvider` |
| Manual | Email signup → home; duplicate username; wrong password; Google new user → onboarding → claim; Google returning user with username → home; sign out → login; `next=/playlists` when logged out → login → playlists placeholder |
| Manual | Airplane mode: login should fail with network message; Firestore profile read may use cache after first login |

**Web e2e reference:** `webmvp/e2e/auth.spec.ts` (optional env credentials).

---

## 9. Definition of done (Phase 1)

- [ ] Email sign-up creates Auth user + `users` + `usernames` atomically; rollback on failure.
- [ ] Email login and Google login work on **Android** with SHA configured.
- [ ] Google first-time user without username **cannot** use any shell route (including `/home`) until onboarding (§2.9).
- [ ] **Guest** can open `/home` only; playlists/profile require login; signed-in users require username for all shell routes.
- [ ] `claimUsername` matches Firestore rules; taken username shows error.
- [ ] `next` redirect works for login/signup/onboarding without open redirect.
- [ ] No admin routes or admin nav.
- [ ] `touchLastLogin` on session start when profile exists.
- [ ] Legacy profile auto-create for Google users without Firestore doc.
- [ ] Theme persists across restarts (`lf-theme`).
- [ ] Profile display name save updates Firestore + Auth (§2.7).
- [ ] Join route stub: signed-out invite flow with `next=/join/p/...` (§2.10).
- [ ] `flutter analyze` clean; `flutter test` passes (validation + redirect tests minimum).
- [ ] Roadmap Phase 1 marked complete in `flutter-roadmap.md`.

### Roadmap Phase 1 user story traceability

| Roadmap story | Covered in |
|---------------|------------|
| Email login → home | §2.2, §2.5, §6.3, Phase 1D/E |
| Signup + username docs | §2.2, §2.8, Phase 1B/C |
| Google → onboarding | §2.3, §2.4, §4 |
| No username → forced onboarding | §2.9, redirect rule 2 |
| Invalid credentials → mapped errors | §2.6, Phase 1C |

---

## 10. Web file → Flutter port map

| Web file | Flutter target |
|----------|----------------|
| `AuthProvider.tsx` | `auth_providers.dart` + `auth_repository.dart` |
| `lib/firestore/users.ts` | `user_repository.dart` |
| `lib/validation.ts` (username) | `domain/validation.dart` |
| `lib/authErrors.ts` | `domain/auth_errors.dart` |
| `lib/safeRedirect.ts` | `domain/safe_redirect.dart` (mobile landing paths) |
| `lib/usernameSuggestions.ts` | `domain/username_suggestions.dart` |
| `lib/userDisplay.ts` | `domain/user_display.dart` |
| `UsernameGate.tsx` | `go_router` redirect + loading scaffold |
| `app/login/page.tsx` | `login_screen.dart` |
| `app/signup/page.tsx` | `signup_screen.dart` |
| `app/onboarding/username/page.tsx` | `username_onboarding_screen.dart` |
| `AppShell.tsx` + `sidebarNav.ts` | `app_shell.dart` (no admin entry) |
| `lib/theme.ts` | `theme_controller.dart` |
| `lib/authRedirect.ts` | **Not ported** (redirect-only web); optional loading flag on Google sign-in |
| `lib/googleAuth.ts` | `auth_repository.googleSignIn()` |
| `lib/firebaseAuthDomain.ts` | N/A (native SDK) |
| `app/join/p/[token]/page.tsx` | `join_playlist_screen.dart` (stub → Phase 5 API) |
| `app/(app)/profile/page.tsx` | `profile_screen.dart` |
| `components/LoginForm.tsx`, `SignupForm.tsx` | `features/auth/widgets/*` |
| `components/AuthDivider.tsx`, `GoogleSignInButton.tsx` | same |
| `lib/firestore/playlistInvites.ts` | Phase 5 (`joinPlaylistByInviteToken`) |

### Domain ports (roadmap Phase 1 checklist)

| Web module | Phase 1 |
|------------|---------|
| `validation.ts` (username) | **Yes** |
| `authErrors.ts` | **Yes** |
| `safeRedirect.ts` | **Yes** (mobile paths + admin reject) |
| `usernameSuggestions.ts` | **Yes** |
| `userDisplay.ts` | **Yes** |
| `firestore/users.ts` | **Yes** |
| `resolveUsernameToUid` | Defer (share-by-username v1.1) |

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Google Sign-In SHA mismatch | §4.2; document in README |
| iOS Google blocked until Mac | Ship Android Phase 1; iOS in parallel when hardware available |
| Package name mismatch in `google-services.json` | Repo has two Android package entries; ensure **`applicationId`** matches registered app |
| Race: profile load vs navigate | Expose `profileResolved` like web; router waits before leaving auth |
| Rules reject profile write | Field names and batch must match `validUserCreate` / `validUsernameClaim` exactly |
| Signed-in user hits `/home` before `profileResolved` | Show shell loading; do not flash onboarding incorrectly |
| Widget test still imports `HomeShell` | Update tests to pump `AppShell` or router with overrides in Phase 1E |

---

## 12. What Phase 1 does *not* cover (later phases — not gaps)

These are in the **web app map** but intentionally **after** Phase 1 per [`flutter-roadmap.md`](flutter-roadmap.md):

| Web map | Phase |
|---------|--------|
| §3.3 Home / `songIndex` | 2 |
| §3.4 Song chart | 3 |
| §3.5 Performance | 4 |
| §3.6 Playlists + join API implementation | 5 |
| §3.7 Groups | 7 |
| §3.12 Offline banner | 6 |
| Deep links `assetlinks.json` / Universal Links | 8 |

Phase 1 only ensures **auth, onboarding, shell, theme, profile, and join landing stub** so later phases plug into the same router and `UserProfile` state.

---

## 13. After Phase 1

- **Phase 2:** [`flutter-phase-2-library.md`](flutter-phase-2-library.md) — home library, index, search (still guest-readable).
- **Phase 5:** `/join/p/:token` calls `POST /api/playlists/join` with Bearer token.
- Update [`flutter-roadmap.md`](flutter-roadmap.md) progress table when this doc’s §9 is satisfied.

---

*End of Phase 1 plan.*
