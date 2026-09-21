# LF Chords mobile — Day zero setup (from scratch)

**Audience:** You have never built a Flutter app before.  
**Today’s goal:** Install tools on Windows, create the `mobile/` app in this repo, run it on an **Android emulator** (or a physical phone).  
**Not today:** Full Firebase, charts, playlists, or offline download — those come next ([`flutter-roadmap.md`](flutter-roadmap.md)).  
**Related:** [`flutter-web-app-map.md`](flutter-web-app-map.md) (what the web app does), [`flutter-roadmap.md`](flutter-roadmap.md) (phases after today).

---

## What you are building (one picture)

```
LF ChordApp repo/
  webmvp/          ← existing Next.js app (admin + web musicians)
  mobile/          ← YOU CREATE THIS — Flutter app (musicians only)
  docs/            ← plans (this file, roadmap, map)
  firestore.rules  ← same backend for web + mobile
```

The mobile app will eventually:

- Read songs and set lists from **Firebase Firestore** (same project as web: `song-db-5e4ed`).
- Keep **offline** copies of a playlist (“download set”) so Sunday service works with bad signal.
- **Not** include admin screens (import/edit songs stays on web).

**Memory matters later:** the song library index can be up to **~10,000** lightweight rows; full song charts are heavier. We will load index in chunks and only prefetch songs you explicitly download — not the whole library. Today you only run the default Flutter “counter” or a tiny LF Chords shell.

---

## Part A — Install everything (Windows, do in order)

Allow **1–2 hours** the first time (downloads + emulator).

### A1. Git (if needed)

You already have this repo; ensure Git works:

```powershell
git --version
```

If missing: install [Git for Windows](https://git-scm.com/download/win).

### A2. Flutter SDK

1. Download **Flutter SDK (stable)** for Windows:  
   https://docs.flutter.dev/get-started/install/windows  
   (Zip install is fine — avoid path with spaces, e.g. `C:\src\flutter`.)

2. Add Flutter to **PATH** (User environment variables):
   - `Path` → add `C:\src\flutter\bin` (your actual path).

3. **Close and reopen** Cursor/terminal, then:

```powershell
flutter --version
flutter doctor
```

4. Accept Android licenses when asked:

```powershell
flutter doctor --android-licenses
```

**Success looks like:** `flutter doctor` shows Flutter and Android toolchain without red errors for Android. iOS will show ✗ on Windows — that is normal.

### A3. Android Studio (SDK + emulator)

1. Install [Android Studio](https://developer.android.com/studio).

2. Open **SDK Manager** (Android Studio → Settings → Languages & Frameworks → Android SDK):
   - **SDK Platforms:** install latest **Android API** (e.g. 35 or 34).
   - **SDK Tools:** Android SDK Build-Tools, Android SDK Platform-Tools, **Android Emulator**, Android SDK Command-line Tools.

3. **Device Manager** → Create Virtual Device:
   - Phone: **Pixel 7** (or similar).
   - System image: **API 34** or **35**, x86_64, with Google Play if offered.
   - RAM: **2–4 GB** for emulator is enough for day zero; more RAM helps later.

4. Start the emulator once from Device Manager (boot fully before `flutter run`).

Optional: enable **Windows Hypervisor** / WHPX if emulator is slow (Android Studio docs).

### A4. Cursor / VS Code extensions

In Cursor:

1. Extensions → install **Flutter** (by Dart Code).
2. It will prompt for **Dart** — install that too.

Settings worth enabling:

- `editor.formatOnSave`: true  
- Dart: **Line Length** 80 (team default; can change later)

### A5. Tools you will need soon (not all required today)

| Tool | When | Install |
|------|------|---------|
| **FlutterFire CLI** | Phase 0 Firebase | `dart pub global activate flutterfire_cli` (after Flutter works) |
| **Java JDK 17** | Android builds | Often bundled with Android Studio |
| **Chrome** | Optional web debug | `flutter run -d chrome` |
| **Xcode + Mac** | iOS builds | Only on macOS — see Part F |

---

## Part B — Create the `mobile/` project (today)

All commands from repo root unless noted.

### B1. Open the repo

```powershell
cd "C:\Users\blaze\Downloads\LF ChordApp"
```

### B2. Create folder and Flutter app

```powershell
mkdir mobile
cd mobile
flutter create . --org com.lfchords --project-name lf_chords --platforms=android,ios
```

What this does:

- Creates `android/`, `ios/`, `lib/main.dart`, tests, etc.
- **Android** package: `com.lfchords.lf_chords` (we will align applicationId to `com.lfchords.app` in a later commit — fine for day zero).
- **iOS** bundle: ready for when you have a Mac.

If `flutter create` says folder not empty, use an empty `mobile/` or `flutter create lf_chords` in a temp folder and move files in.

### B3. Run on emulator

1. Start Android emulator (Android Studio Device Manager).
2. List devices:

```powershell
flutter devices
```

3. Run:

```powershell
flutter run
```

You should see the default Flutter demo (blue app bar, counter). **That is success for day zero.**

### B4. Run tests (sanity check)

```powershell
flutter test
```

Default template includes one widget test — it should pass.

### B5. Optional: rename app display name

- **Android:** `android/app/src/main/AndroidManifest.xml` → `android:label="LF Chords"`.
- **iOS:** `ios/Runner/Info.plist` → `CFBundleDisplayName`.

Hot reload: with app running, press `r` in the terminal; full restart `R`.

---

## Part C — First code changes (still “basic app”)

Replace the counter with a minimal **LF Chords shell** so you know you are editing the right project.

**File:** `mobile/lib/main.dart` — use a simple `MaterialApp` with:

- Title: **LF Chords**
- Home: centered text “Musician app — setup OK”
- `ThemeData` seed color (dark grey or brand color later)

Then:

```powershell
flutter analyze
flutter test
flutter run
```

**Definition of done (today):**

- [ ] `flutter doctor` — Android OK  
- [ ] `mobile/` exists in repo  
- [ ] `flutter run` works on emulator or USB device  
- [ ] `flutter test` passes  
- [ ] Home screen shows LF Chords shell (not generic counter)  
- [ ] You know how to hot reload  

Do **not** commit secrets. Committing `mobile/` without `build/`, `.dart_tool/` is normal (Flutter’s `.gitignore` is created by `flutter create`).

---

## Part D — Local data & memory plan (foundation, not built today)

This is **why** the stack choices in [`flutter-roadmap.md`](flutter-roadmap.md) exist. Implement in later phases; understand now so you do not paint into a corner.

### D1. Sources of truth

| Data | Where it lives | Offline |
|------|----------------|---------|
| Song list metadata (title, artist, key, tags) | Firestore `songIndex/chunk0..4` | Cache after first fetch |
| Full chart (sections, chords) | Firestore `songs/{id}` | Per-song cache when opened or **downloaded** |
| Playlists | Firestore `sessions` + `sessionSongs` | **Download set** = prefetch session + all songs in set |
| Recent songs, zoom, theme | Device only (`shared_preferences`) | Always local |
| User profile | Firestore `users/{uid}` | Small doc, cached by SDK |

**No** guest-only local song library like old web `localStorage` — mobile is **Firebase-only** for songs.

### D2. Memory guidelines (targets for later implementation)

| Item | Rough size | Strategy |
|------|------------|----------|
| Full index (~10k entries) | Low MB JSON in RAM | Single merged list; search in Dart; avoid duplicating `searchText` in UI models |
| One song chart | Tens of KB – few MB worst case | Load on demand; release from memory when leaving screen if needed |
| Downloaded set (10–30 songs) | Bounded | User action “Download for offline”; store in Firestore disk cache, not a second copy in RAM |
| Images / assets | Minimal | Charts are text/layout, not PDFs |

### D3. Offline behavior (later phases)

1. **Firestore persistence** — on by default on Android/iOS; reads work offline after first load.  
2. **Explicit “Download set”** — port web `cacheSessionOffline`: server-fetch playlist doc + each `songs/{id}` in the set.  
3. **Connectivity UI** — banner when offline (web uses `/connectivity.txt`; mobile will use `connectivity_plus` + Firestore reachability).  

Today: none of this is wired — only the plan.

### D4. Packages (install later, not day zero)

When you finish day zero, the next session adds to `pubspec.yaml` (see roadmap Appendix A):

- `firebase_core`, `cloud_firestore`, `firebase_auth`
- `flutter_riverpod`, `go_router`
- `shared_preferences`, `wakelock_plus`, `connectivity_plus`

Run `flutter pub get` after each batch.

---

## Part E — Android physical device (optional, often easier than emulator)

1. On phone: **Developer options** → **USB debugging** on.  
2. Install OEM USB driver if Windows does not see the device.  
3. Cable → allow debugging prompt on phone.  
4. `flutter devices` → should list the phone.  
5. `flutter run -d <device-id>`.

---

## Part F — iOS (plan now, build on a Mac later)

You **cannot** build or run the iOS simulator on Windows.

When you have access to a Mac:

1. Install Xcode from App Store.  
2. `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`  
3. `sudo xcodebuild -runFirstLaunch`  
4. `cd mobile && flutter doctor` (should show Xcode).  
5. Open `ios/Runner.xcworkspace` in Xcode once to trust signing (team Apple ID).  
6. `flutter run` with iOS Simulator.

Register the same Firebase iOS app when you run `flutterfire configure` (roadmap Phase 0).

---

## Part G — Troubleshooting (Windows)

| Problem | Try |
|---------|-----|
| `flutter` not recognized | PATH to `flutter\bin`; restart terminal |
| Emulator not listed | Cold boot emulator; `adb kill-server` then `adb start-server` |
| Gradle download slow | First build takes long; wait on good network |
| “Android licenses not accepted” | `flutter doctor --android-licenses` |
| Build fails SDK version | Open `android/` in Android Studio; let it sync Gradle |
| Port / install stuck | `flutter clean` then `flutter pub get` then `flutter run` |

---

## Part H — What happens after today (checklist)

Use this as your personal sequence; matches roadmap **Phase 0 → 1**.

| Step | Task | Doc |
|------|------|-----|
| 1 | ✅ Day zero: Flutter + `mobile/` + run app | **This file** |
| 2 | `flutterfire configure` → project `song-db-5e4ed` | [`flutter-roadmap.md`](flutter-roadmap.md) §1 |
| 3 | `firebase_core` init + debug line showing project id | Roadmap Phase 0 DoD |
| 4 | Auth (email + Google) | Roadmap Phase 1 |
| 5 | Song index + home search | Roadmap Phase 2 |
| 6 | Chart + transpose | Roadmap Phase 3 |
| 7 | Performance mode + playlists + join API | Roadmap Phases 4–5 |
| 8 | Download set + offline banner | Roadmap Phase 6 |

---

## Part I — Quick command reference

```powershell
# From mobile/
flutter doctor -v
flutter devices
flutter run
flutter run -d chrome          # optional
flutter test
flutter analyze
flutter clean
flutter pub get

# Repo root
cd "C:\Users\blaze\Downloads\LF ChordApp\mobile"
```

---

## Part J — Today’s session summary

1. Install **Flutter** + **Android Studio** + emulator.  
2. `flutter doctor` clean for Android.  
3. `flutter create` inside **`mobile/`**.  
4. **`flutter run`** → see app on screen.  
5. Replace counter with **LF Chords** placeholder UI.  
6. **`flutter test`** passes.  

You are not expected to understand Dart, Firestore, or offline caching yet — only to have a **running foundation** on Android. iOS and Firebase are explicitly scheduled for the next steps on the roadmap.

---

*Last updated: 2026-09-21*
