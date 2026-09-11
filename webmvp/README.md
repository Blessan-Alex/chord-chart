# LF ChordApp — Web MVP

Next.js prototype for worship chord charts: paste lyrics, place chords, transpose live.

## Setup

```bash
cd webmvp
npm install
cp .env.example .env.local   # fill in Firebase keys when ready
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint on `src` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run emulators` | Firestore + Auth emulators (from repo root config) |

## Data

Songs are stored in browser `localStorage` under key `lf-chord-app-songs`. Built-in presets are read-only in `src/data/presets.ts`.

Firebase wiring (Phase 5c) will use Firestore when signed in; localStorage + presets remain the fallback when not.

Architecture: [`tickets/MAP.md`](tickets/MAP.md) and [`../docs/`](../docs/).

---

## Firebase (Phase 5a)

Config lives at the **repo root**: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `.firebaserc`.

### P0-01 — Create project

1. [Firebase Console](https://console.firebase.google.com/) → Create project (Spark / free tier).
2. Enable **Authentication** → Email/Password.
3. Enable **Firestore** → production mode (rules deployed from repo).
4. Set project ID in `.firebaserc` at repo root:
   ```bash
   npx -y firebase-tools@latest use your-project-id
   ```

### P0-02 / P0-03 — SDK + persistence

- `firebase` package installed.
- `src/lib/firebase.ts` — `getDb()` uses `persistentLocalCache` (not wired to UI yet).
- Copy `.env.example` → `.env.local` with Web app config from Firebase Console.

### P0-04 — Deploy rules

```bash
# From repo root, after firebase login
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes
```

Rules match `docs/03` (custom claim `admin`, self-signup `users`, `songIndex` read-only).

### P0-08 — App Check

1. Firebase Console → App Check → Register web app → **reCAPTCHA Enterprise**.
2. Add site key to `.env.local` as `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY`.
3. Call `initAppCheck()` from client after auth UI lands (Phase 5c).
4. Console → Enforce App Check on Firestore when ready for production.

### P1-03 — Seed Firestore (presets + songIndex)

```bash
# Production — service account JSON outside repo
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npm run seed

# Emulator (Terminal 1: npm run emulators)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed
```

Writes 10 preset songs to `songs/`, builds `songIndex/chunk0`, and `meta/stats`.

### P0-06 — Grant admin claim

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npm run set-admin user@example.com
```

User must sign out and sign in again for `isAdmin` to apply.

### Integration tests (P1-09)

```bash
# Terminal 1
npm run emulators

# Terminal 2
npm run test:integration
```

### Local emulators

```bash
# Terminal 1 (repo root via webmvp script)
cd webmvp && npm run emulators

# .env.local
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

Emulator UI: [http://localhost:4000](http://localhost:4000)

---

## Deploy — Vercel Hobby (P0-09)

1. Import repo on [vercel.com](https://vercel.com).
2. Set **Root Directory** to `webmvp`.
3. Add environment variables from `.env.example` (Production + Preview).
4. Deploy — `/song/[id]` dynamic routes work on Hobby.

```bash
# Optional CLI
cd webmvp
npx vercel
```

`vercel.json` is included for explicit Next.js framework detection.
