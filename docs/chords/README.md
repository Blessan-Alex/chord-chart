# LF ChordApp — Firebase Architecture Documents

> Implementation-ready design for evolving the web MVP into a Firebase Firestore-backed app on **Spark (free tier)**.

## Documents

| # | Document | Description |
|---|---|---|
| — | [Architecture](ARCHITECTURE.md) | Current MVP + planned Firebase data flow |
| 1 | [Product & UX Overview](01-product-ux-overview.md) | User types, core flows, UI map |
| 2 | [Data Model & Firestore Schema](02-data-model-firestore-schema.md) | Collections, `songIndex`, soft-delete, versioning |
| 3 | [Security Rules & Access Patterns](03-security-rules-access-patterns.md) | Canonical `firestore.rules`, App Check, custom claims |
| 4 | [API / Client Usage Patterns](04-api-client-usage-patterns.md) | SDK patterns, local search, transactions |
| 5 | [Phased Implementation Plan](05-phased-implementation-plan.md) | Tickets with dependencies and status |
| 6 | [Test Plan](06-test-plan.md) | Unit (done), emulator, E2E (planned) |
| 7 | [Migration & Growth Notes](07-migration-growth-notes.md) | Import, backup, schema evolution |
| 8 | [Cost Budget](08-cost-budget.md) | Spark read/write budgets per action |

**9 documents total** (Architecture + 01–08).

## Current Codebase Context

Commit **`c9bb044`** — foundation hardening complete:

- **Transposition engine** (`engine.ts`) — transpose, degrees, diatonic palette, `isValidChord`
- **Chord model** — `Song → Section[] → LyricLine → ChordMark{chord, position}`
- **Components** — `ChordRow`, `ChordLine`, `InteractiveEditor`, `HomePage`
- **Validation** — `validation.ts` called before every `saveSong`
- **Tests** — Vitest, **37 tests** in `src/lib/*.test.ts`
- **Storage** — `localStorage` key `lf-chord-app-songs` (Firestore fallback when authed — see R17)
- **Presets** — 10 worship songs in `presets.ts` (read-only seed)

## Spark Tier Constraints

1. **No Cloud Functions** — self-signup `users` docs, custom claim `admin`, Admin SDK scripts only (R1, R2)
2. **No per-keystroke Firestore queries** — `songIndex` chunks + local substring search (R4)
3. **`publishDraft` / session writes use `runTransaction`** — conflict detection, fractional order (R6, R7)
4. **App Check required** before public launch (R11)
5. **Cost budget** — see [08-cost-budget.md](08-cost-budget.md)

## Hosting

**Recommended:** [Vercel Hobby](https://vercel.com) — dynamic `/song/[id]` works out of the box.

Firebase Hosting requires static export or query-param routing unless on Blaze.

## Key Design Decisions

1. Same chord position model as MVP — minimal refactor into Firestore
2. `songIndex` collection for search — not `titleLower` prefix queries
3. Soft-delete songs (`status: archived`) — sessions keep valid references
4. Admin = Firebase Auth custom claim — not Firestore `users.role`
5. Offline = Firestore persistence + `getDocFromCache`; localStorage when not signed in
