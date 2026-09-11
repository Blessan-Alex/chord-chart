# LF ChordApp — Web MVP

Next.js prototype for worship chord charts: paste lyrics, place chords, transpose live.

## Setup

```bash
cd webmvp
npm install
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

## Data

Songs are stored in browser `localStorage` under key `lf-chord-app-songs`. Built-in presets are read-only in `src/data/presets.ts`.

Architecture details: [`tickets/MAP.md`](tickets/MAP.md) and [`../docs/`](../docs/).
