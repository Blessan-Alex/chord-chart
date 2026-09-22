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
| `/home` | Guest-OK shell tab (library in Phase 2) |
| `/login`, `/signup` | Email + Google; `?next=` safe redirect |
| `/onboarding/username` | Username claim |
| `/join/p/:token` | Invite landing (join API in Phase 5) |
| `/playlists`, `/profile` | Auth required |

## Tests

```bash
flutter analyze
flutter test
```

## Later phases

- **`JOIN_API_BASE_URL`** — document when Phase 5 wires playlist join (`--dart-define`); not used in Phase 1.

See [`docs/flutter-phase-1-auth.md`](../docs/flutter-phase-1-auth.md) and [`docs/flutter-phase-1-web-auth-report.md`](../docs/flutter-phase-1-web-auth-report.md).
