# LF Chords — Flutter mobile (`lf_chords`)

Musician client for Firebase project **`song-db-5e4ed`** (same Auth / Firestore rules as `webmvp/`).

## Prerequisites

- Flutter SDK (see `pubspec.yaml` SDK constraint)
- Android Studio or VS Code + Android emulator/device
- Firebase Android app registered with matching **`applicationId`** (`com.lfchords.lf_chords`)

## Run

```bash
cd mobile
flutter pub get
flutter run
```

## Google Sign-In (Android)

1. Print debug SHA-1 / SHA-256:
   ```bash
   cd android
   ./gradlew signingReport
   ```
   (Windows: `gradlew.bat signingReport`)
2. Firebase Console → Project settings → Android app → add SHA-1 and SHA-256.
3. Re-download `android/app/google-services.json` if prompted.
4. Web OAuth client ID used as `serverClientId` is documented in `lib/core/routing/route_paths.dart` (`googleSignInWebClientId`) — from Firebase Google provider (Web client, type 3).

Common failures: `10:` / `12500` / `developer_error` → SHA mismatch or wrong package name.

## Phase 1 routes

| Path | Purpose |
|------|---------|
| `/home` | Guest-OK library (search, filters, browse pagination) |
| `/song/:id` | Read-only chart (transpose, numbers, zoom, live Firestore); playlist query params |
| `/login`, `/signup` | Email + Google; `?next=` safe redirect |
| `/onboarding/username` | Username claim |
| `/join/p/:token` | Invite link → HTTPS join API → playlist detail |
| `/playlists`, `/playlists/new`, `/playlists/:id` | List, create, detail (auth + username) |
| `/profile` | Auth required |

## Phase 2 — song index

- Library reads **`songIndex/chunk0`…`chunk4` only** (no `songs` queries for browse).
- After first online load, Firestore persistence serves cached chunks offline (read-only list).
- In-memory merged index (~10k entries max); search/filter runs on-device with zero extra reads per keystroke.

## Phase 3 — song chart

- **`SongRepository.watchSong`** — active-only live stream; not found for archived/missing.
- Transpose, Nashville numbers (degrees from **original key**, same as web), pinch/button zoom + persisted scale.
- **`?playlist=` / `?session=` / `?index=` / `?key=`** — session context; back navigates to `/playlists/{sessionId}` (Phase 5 detail placeholder until CRUD ships).
- Share uses `share_plus` with `https://lfchords.app/song/{id}` (configurable later).

## Phase 4 — performance mode

- **Autoscroll** with web speed curve; **AutoscrollBar** (pause/speed/close).
- **Wake lock** during autoscroll or fullscreen (`wakelock_plus`).
- **Fullscreen** immersive UI + overlay (next song, zoom, exit).
- **Performance bottom bar** on phone (&lt;768): prev/next, key, zoom, theme cycle, autoscroll, fullscreen.
- **Tablet/desktop:** autoscroll/fullscreen on control bar; theme toggle on bottom bar only (web parity).
- **Swipe** 72px horizontal for set navigation; **`startSetPath`** for Phase 5.
- Chart theme **`lf-chart-theme`** (system / dark / stage).

## Phase 5 — playlists & join

- **`SessionRepository`** / **`SessionSongsRepository`** — four-query list merge, CRUD, live `sessionSongs` stream.
- **`JoinApiClient`** — `POST {JOIN_API_BASE_URL}/api/playlists/join` with Firebase ID token.
- **`--dart-define=JOIN_API_BASE_URL`** (default `https://lfchords.vercel.app`) for join API and invite link URLs.
- Playlists tab: sections, search, create, detail (add/reorder/key/publish/delete/share).
- **`/join/p/:token`** — auth-only (no username gate); auto-join when signed in.
- Song screen **Add to playlist** (owned lists only); home **My playlists** preview (2 cards, 3 song lines).
- **No** username share form, offline cache, groups, or admin bypass (v1).

## Tests

```bash
flutter analyze
flutter test
```

## Configuration

```bash
flutter run --dart-define=JOIN_API_BASE_URL=https://lfchords.vercel.app
```

Use a staging URL for internal join smoke tests.

## Docs

See [`docs/flutter-phase-5-playlists.md`](../docs/flutter-phase-5-playlists.md), [`docs/flutter-phase-5-web-playlists-report.md`](../docs/flutter-phase-5-web-playlists-report.md), [`docs/flutter-phase-1-auth.md`](../docs/flutter-phase-1-auth.md), [`docs/flutter-phase-1-web-auth-report.md`](../docs/flutter-phase-1-web-auth-report.md), [`docs/flutter-phase-2-library.md`](../docs/flutter-phase-2-library.md), [`docs/flutter-phase-2-web-library-report.md`](../docs/flutter-phase-2-web-library-report.md), [`docs/flutter-phase-3-song-chart.md`](../docs/flutter-phase-3-song-chart.md), [`docs/flutter-phase-3-web-song-chart-report.md`](../docs/flutter-phase-3-web-song-chart-report.md), [`docs/flutter-phase-4-performance.md`](../docs/flutter-phase-4-performance.md), and [`docs/flutter-phase-4-web-performance-report.md`](../docs/flutter-phase-4-web-performance-report.md).
