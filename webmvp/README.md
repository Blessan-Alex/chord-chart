# LF ChordApp — Web MVP

Next.js worship chord chart app: shared Firestore library, sessions, transpose, draft/publish editing.

## Setup

```bash
cd webmvp
npm install
cp .env.example .env.local   # Firebase + optional App Check keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build |
| `npm run lint` / `typecheck` | Quality checks |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:integration` | Firestore emulator tests |
| `npm run test:e2e` | Playwright smoke (build first) |
| `npm run emulators` | Firestore + Auth emulators |
| `npm run seed` | Seed presets to Firestore (Admin SDK) |
| `npm run rebuild-index` | Rebuild `songIndex` from active songs |
| `npm run set-admin <email>` | Grant admin custom claim |
| `npm run export-songs` | JSON backup to stdout |
| `npm run seed-load-test <n>` | Seed N synthetic songs + rebuild index |
| `npm run generate-pwa-icons` | PNG icons from `public/icon.svg` |

## Data model

| Signed in | Storage |
|---|---|
| Yes | Firestore (`songs`, `songIndex`, `sessions`, `songEdits`) |
| No | `localStorage` on this device only |

Search uses cached `songIndex` chunks (no per-keystroke Firestore reads). See [`../docs/chords/`](../docs/chords/).

## Dev tools

- `NEXT_PUBLIC_READ_COUNTER=true` — log Firestore read counts in browser console
- `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` — optional Playwright auth smoke test

## Firebase

Config at repo root: `firebase.json`, `firestore.rules`, `firestore.indexes.json`.

Deploy rules: `npx firebase-tools deploy --only firestore:rules` (from repo root).

App Check enforce: [`../docs/chords/ops-app-check-enforce.md`](../docs/chords/ops-app-check-enforce.md)

## Responsive QA

[`../docs/chords/responsive-qa.md`](../docs/chords/responsive-qa.md)
