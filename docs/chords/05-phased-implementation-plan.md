# Document 5 — Phased Implementation Plan (Tickets)

> **Spark tier — no Cloud Functions.** Admin via custom claims. Search via cached `songIndex`. See `docs/08-cost-budget.md`.

**Status:** Phases 0–4 + sessions + CI deployed. See `docs/todo.md` for live checklist. Remaining: App Check enforce (console), P5 load audit.

---

## Phase 0 — Project Setup

| # | Ticket | Files | Verify | Status |
|---|---|---|---|---|
| P0-01 | Create Firebase project (Spark), enable Auth + Firestore | `firebase.json` | Console shows project | 🔲 |
| P0-02 | Install Firebase SDK | `src/lib/firebase.ts` | `import { db }` compiles | 🔲 |
| P0-03 | Enable Firestore persistence | `firebase.ts` | Offline read works in devtools | 🔲 |
| P0-04 | Deploy security rules from `docs/03` | `firestore.rules` | Unauthed read denied | 🔲 |
| P0-05 | Login page + `AuthProvider` | `app/login/page.tsx`, `hooks/useAuth.ts` | Sign-in persists | 🔲 |
| P0-06 | ~~Create admin manually~~ → use `scripts/set-admin.ts` | `scripts/set-admin.ts` | `token.admin === true` | 🔲 |
| P0-07 | `useAuth` hook | `hooks/useAuth.ts` | `isAdmin` from claim | 🔲 |
| **P0-08** | **App Check** (reCAPTCHA v3) | `firebase.ts`, console | Enforced in rules | 🔲 |
| **P0-09** | **Deployment** — Vercel Hobby | `README.md` | `/song/[id]` resolves live | 🔲 |
| **P0-10** | **Vitest unit tests** | `src/lib/*.test.ts` | `npm run test` — 37 pass | ✅ DONE |

**P0-09 note:** Vercel Hobby supports dynamic `/song/[id]`. Firebase Hosting needs static export or `?id=` query param unless on Blaze with Functions.

---

## Phase 1 — Data Model Foundation

| # | Ticket | Files (max) | Verify | Status |
|---|---|---|---|---|
| P1-01 | Extend `types.ts` for Firestore fields | `types.ts` | `tsc --noEmit` | 🔲 |
| P1-02 | `firestore/songs.ts` CRUD + archive | `firestore/songs.ts` | Emulator create/read | 🔲 |
| P1-03 | Seed presets + songIndex | `scripts/seed-songs.ts` | 10 songs + index chunks | 🔲 |
| P1-04 | `firestore.indexes.json` | `firestore.indexes.json` | Deploy no warnings | 🔲 |
| P1-05 | Wire HomePage: Firestore when authed, localStorage when not | `HomePage.tsx`, `storage.ts` | Both paths work (R17) | 🔲 |
| P1-06 | Paginated admin song browser (not search) | `useSongs.ts` | Load more 20 at a time | 🔲 |
| **P1-07** | **Library index + `useSongSearch`** | `firestore/songIndex.ts`, `useSongSearch.ts` | "maker" finds Way Maker, 0 reads/key | 🔲 |
| **P1-08** | **Self-signup user profile** | `useAuth.ts`, signup flow | New user gets `users/{uid}` role musician | 🔲 |
| **P1-09** | **Emulator rules tests** | `rules.integration.test.ts` | Claims-based admin pass | 🔲 |

---

## Phase 2 — Core Web Features

| # | Ticket | Status | Notes |
|---|---|---|---|
| ~~P2-01~~ | Song list search | **SUPERSEDED** | Use P1-07 library index |
| ~~P2-02~~ | Key filter | **SUPERSEDED** | Client filter on index |
| ~~P2-03~~ | Tag filter | **SUPERSEDED** | Client filter on index |
| P2-04 | Song detail from Firestore | 🔲 | Cache-first `getSong` |
| P2-05 | Admin import → `createSong` | 🔲 | Gated by `isAdmin` |
| P2-06 | Admin-only UI gating | 🔲 | Hide Add/Edit for musicians |
| P2-07 | Pagination (admin browser) | 🔲 | Not needed for search |
| P2-08 | Offline indicator | 🔲 | `useOnlineStatus` + banner |
| **P2-09** | **PWA shell** (R9) | 🔲 | `manifest.json` + service worker |
| **P2-10** | **`export-songs.ts` backup** (R12) | 🔲 | Weekly manual JSON export |

---

## Phase 3 — Sessions

| # | Ticket | Files | Verify |
|---|---|---|---|
| P3-01 | `sessions.ts` + `sessionSongs.ts` | 2 new modules | Emulator CRUD |
| P3-02 | Session list page | `app/sessions/page.tsx` | Renders by date |
| P3-03 | Session builder (admin) | `app/sessions/new/page.tsx` | Create + add songs |
| P3-04 | Add to session from song view | `song/[id]/page.tsx` | Modal + transaction |
| P3-05 | Session view (band) | `app/sessions/[id]/page.tsx` | Ordered set list |
| P3-06 | Key override per session song | session builder | Override displays |
| P3-07 | Cache session offline | session view button | Airplane mode works |
| P3-08 | Fractional reorder | `sessionSongs.ts` | 1 write per drag |

---

## Phase 4 — Chord Edit Workflow

| # | Ticket | Files | Verify |
|---|---|---|---|
| P4-01 | `songEdits.ts` | `firestore/songEdits.ts` | Draft CRUD |
| P4-02 | Edit button → createDraft | `song/[id]/page.tsx` | Draft doc created |
| P4-03 | Draft editor page | `song/[id]/edit/page.tsx` | InteractiveEditor on draft |
| P4-04 | publishDraft transaction | `songEdits.ts` | baseVersion conflict throws |
| P4-05 | Discard draft | `songEdits.ts` | Draft deleted |
| P4-06 | Version history (last 10) | song detail admin | Archived list |

---

## Phase 5 — Hardening

| # | Ticket | Verify |
|---|---|---|
| P5-01 | Seed 1,000 songs + index | Index chunks ≤ 1 |
| P5-02 | Home load ≤ 5 reads | Dev read counter |
| P5-03 | Pagination no dupes | 50 pages clean |
| P5-04 | Index audit | `firebase deploy --only firestore:indexes` |
| P5-05 | Error handling audit | No unhandled rejections |
| P5-06 | Firebase usage alerts | 80% threshold in console |
| P5-07 | Rules emulator suite | All P1-09 tests pass |

---

## Optional code polish (not blocking Firebase)

| Item | Notes |
|---|---|
| Edit song route (`/song/[id]/edit`) | Before P4 or as localStorage-only first |
| Replace `confirm()` delete | Modal component |
| HomePage empty/error states | UX |
| `InteractiveEditor` split | Chart + modal components |
| `ChordLine` memoization | Performance at scale |

---

## Dependency chain

```
P0-01 → P0-02 → P0-03, P0-04, P0-05 → P0-07, P0-08
P0-09 (deploy) can parallel after P0-02
P0-10 ✅

P1-01 → P1-02 → P1-03, P1-04
P1-02 + P0-07 → P1-05, P1-07, P1-08
P0-04 → P1-09

P1-07 → P2-04, P2-05, P2-06
P1-02 → P3-01 → P3-02 … P3-08
P1-02 → P4-01 → P4-02 … P4-06

P1-09 + P5-* → production ready
```
