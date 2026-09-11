# Document 5 — Phased Implementation Plan (Tickets)

## Overview

```
Phase 0  →  Phase 1  →  Phase 2  →  Phase 3  →  Phase 4  →  Phase 5
Setup       Data         Core Web     Sessions    Edit Flow   Hardening
(1 day)     (1 day)      (3-4 days)   (2-3 days)  (2 days)    (1-2 days)
```

---

## Phase 0 — Project Setup

**Goal:** Firebase project configured, SDK integrated into existing Next.js web app, basic auth flow.

| # | Ticket | Description | Acceptance Criteria |
|---|---|---|---|
| P0-01 | **Create Firebase project** | Create Firebase project in console, enable Firestore (Spark free tier), enable Authentication (Email/Password) | Firebase console shows project with Firestore and Auth enabled |
| P0-02 | **Install Firebase SDK** | `npm install firebase` in `webmvp/`, create `src/lib/firebase.ts` with app init, auth, and db exports | `import { db, auth } from '@/lib/firebase'` works in any component |
| P0-03 | **Enable Firestore persistence** | Configure `persistentLocalCache` in `firebase.ts` | Firestore reads work after going offline in dev tools |
| P0-04 | **Deploy initial security rules** | Create `firestore.rules` file, deploy via Firebase CLI or console with the rules from Document 3 | Rules deployed, unauthenticated reads return permission denied |
| P0-05 | **Basic auth UI** | Create `/login` page with email/password sign-in, store auth state in React context, protect routes | User can sign in, auth state persists on refresh, `/` redirects to `/login` if not authenticated |
| P0-06 | **Create admin user** | Manually create admin user in Firebase Auth console, set `role: "admin"` in Firestore `users` collection via console | Admin user can sign in and `users/{uid}.role === "admin"` |
| P0-07 | **Create `useAuth` hook** | React hook that provides `user`, `role`, `isAdmin`, `isLoading`, `signOut` | Components can conditionally render admin-only UI |

---

## Phase 1 — Data Model Foundation

**Goal:** Firestore collections created with sample data, types extended, existing localStorage code replaced.

| # | Ticket | Description | Acceptance Criteria |
|---|---|---|---|
| P1-01 | **Extend TypeScript types** | Update `src/lib/types.ts` to include all Firestore fields: `artist`, `tempo`, `tags`, `ccli`, `copyright`, `notes`, `version`, `createdBy`, `createdAt`, `updatedAt`, `titleLower` | Types compile, no breaking changes to existing components |
| P1-02 | **Create Firestore service modules** | Create `src/lib/firestore/songs.ts` with `listSongs`, `getSong`, `createSong`, `updateSong`, `deleteSong` | Functions compile and match API patterns from Document 4 |
| P1-03 | **Seed 10 sample songs** | Create `scripts/seed-songs.ts` script that writes the 10 preset songs from `presets.ts` to Firestore as real documents | Running `npx tsx scripts/seed-songs.ts` creates 10 documents in `songs` collection |
| P1-04 | **Create composite indexes** | Define indexes in `firestore.indexes.json` or Firebase console for queries in Document 2 section 2.7 | `listSongs` with key filter and title sort returns results without index errors |
| P1-05 | **Replace localStorage reads with Firestore** | Update `HomePage.tsx` to call `listSongs()` instead of `getSongs()`, update `SongPage` to call `getSong()` from Firestore | Song list and song detail load from Firestore; localStorage code is unused |
| P1-06 | **Create `useSongs` hook** | React hook wrapping `listSongs` with pagination state, loading indicator, and error handling | Song list paginates with "Load More" button |

---

## Phase 2 — Core Web Features

**Goal:** Song list, song detail, search/filter, and admin import all work with Firestore.

| # | Ticket | Description | Acceptance Criteria |
|---|---|---|---|
| P2-01 | **Song list with search** | Add search input to `HomePage` that calls `listSongs({ searchPrefix })` on debounced input | Typing "good" shows "Good Good Father" within 300ms |
| P2-02 | **Song list key filter** | Add key dropdown filter to `HomePage` that filters songs by `originalKey` | Selecting "G" shows only songs in key of G |
| P2-03 | **Song list tag filter** | Add tag chip buttons (populated from a set of known tags) that filter via `array-contains` | Clicking "worship" shows tagged songs |
| P2-04 | **Song detail from Firestore** | Update `/song/[id]/page.tsx` to fetch from Firestore, remove preset fallback logic | Song detail loads from Firestore, transpose and view toggle work as before |
| P2-05 | **Admin import flow (Firestore)** | Update `/import/page.tsx` to call `createSong()` instead of `saveSong()` (localStorage), only show import button for admin users | Admin can import a new song, it appears in Firestore and song list |
| P2-06 | **Admin-only UI gating** | Conditionally show "Add Song", "Edit", "Delete" buttons based on `isAdmin` from `useAuth` | Musicians see read-only UI, admins see edit controls |
| P2-07 | **Pagination** | Implement cursor-based "Load More" button in song list | After 20 songs, "Load More" fetches next page |
| P2-08 | **Offline indicator** | Create `useOnlineStatus` hook + `OfflineBanner` component shown when offline | Yellow banner "You're offline — showing cached data" appears when network is lost |

---

## Phase 3 — Sessions & Sharing

**Goal:** Admins can create sessions (set lists), musicians can view and cache them offline.

| # | Ticket | Description | Acceptance Criteria |
|---|---|---|---|
| P3-01 | **Create Firestore session modules** | Create `src/lib/firestore/sessions.ts` and `sessionSongs.ts` with all CRUD functions from Document 4 | Functions compile, unit-callable |
| P3-02 | **Session list page** | Create `/sessions` route showing upcoming sessions grouped by service type, newest first | Page renders sessions with date and service type labels |
| P3-03 | **Session builder page (admin)** | Create `/sessions/new` with form: title, service type dropdown, date picker, song search + add | Admin can create a session with 3-5 songs |
| P3-04 | **Add song to session** | In song detail, add "Add to Session" button → modal to select session → calls `addSongToSession()` | Song appears in selected session's set list |
| P3-05 | **Session view page (band)** | Create `/sessions/[id]` showing ordered song list with per-song key override displayed | Musicians see the set list with song titles and keys |
| P3-06 | **Session song key override** | In session builder, allow admin to set a per-song key override | When musician opens song from session, it defaults to the override key |
| P3-07 | **Cache session for offline** | Add "Cache for Offline" button on session view that calls `cacheSessionForOffline()` | After caching, session and songs load in airplane mode |
| P3-08 | **Reorder session songs** | In session builder, allow drag-and-drop or up/down buttons to reorder songs | Reorder persists via `reorderSessionSongs()` batch write |

---

## Phase 4 — Chord Edit Workflow

**Goal:** Admins can safely edit original chords with draft/publish workflow and version history.

| # | Ticket | Description | Acceptance Criteria |
|---|---|---|---|
| P4-01 | **Create songEdits Firestore module** | Create `src/lib/firestore/songEdits.ts` with `createDraft`, `getDraft`, `saveDraft`, `publishDraft`, `discardDraft`, `getVersionHistory` | Functions compile, match Document 4 patterns |
| P4-02 | **Edit button + draft creation** | On song detail (admin), "Edit" button creates a draft via `createDraft()` and redirects to `/song/[id]/edit` | Clicking "Edit" creates a `songEdits` doc with `status: "draft"` |
| P4-03 | **Draft editor page** | Create `/song/[id]/edit` that loads the draft (not the published song) and renders the `InteractiveEditor` | Editor shows draft data; changes save to the draft doc |
| P4-04 | **Publish draft** | "Publish" button in editor calls `publishDraft()`, archives current version, applies draft to song | Song detail shows updated chords; draft doc is deleted |
| P4-05 | **Discard draft** | "Discard" button deletes the draft doc, returns to song detail | Draft is gone, song unchanged |
| P4-06 | **Version history list** | On song detail (admin), show version history from `songEdits` where `status: "archived"` | Admin sees list of past versions with dates |

---

## Phase 5 — Hardening & Scale

**Goal:** Performance verified at scale, monitoring in place, ready for production.

| # | Ticket | Description | Acceptance Criteria |
|---|---|---|---|
| P5-01 | **Seed 1,000 songs** | Create script that generates 1,000 realistic song documents for load testing | Firestore contains 1,000+ songs |
| P5-02 | **Performance test: list latency** | Measure time to load first page of 20 songs at 1,000 docs | First page loads in <500ms on 4G connection |
| P5-03 | **Performance test: pagination** | Verify cursor pagination works correctly through 50+ pages | No duplicate or missing songs across pages |
| P5-04 | **Index audit** | Check Firebase console for any auto-created or missing indexes, clean up unused ones | No index warnings in console, no slow queries |
| P5-05 | **Error handling audit** | Review all Firestore calls for proper try/catch, user-facing error messages, retry on transient failure | No unhandled promise rejections |
| P5-06 | **Monitoring setup** | Enable Firebase Analytics, configure Firestore usage alerts in Firebase console | Alerts fire when daily reads exceed 80% of Spark quota |
| P5-07 | **Security rules test** | Run Firestore emulator with rule tests: musician can't write songs, anon can't read | All rule tests pass |

---

## Ticket Dependency Chain

```
Phase 0: P0-01 → P0-02 → P0-03
                  P0-02 → P0-04
                  P0-02 → P0-05 → P0-06 → P0-07

Phase 1: P0-07 → P1-01 → P1-02 → P1-03
                  P1-02 → P1-04
                  P1-02 → P1-05 → P1-06

Phase 2: P1-06 → P2-01 → P2-02 → P2-03
         P1-05 → P2-04
         P1-02 → P2-05
         P0-07 → P2-06
         P1-06 → P2-07
         P0-03 → P2-08

Phase 3: P1-02 → P3-01 → P3-02
                  P3-01 → P3-03 → P3-08
                  P3-01 → P3-04
                  P3-01 → P3-05 → P3-07
                  P3-03 → P3-06

Phase 4: P1-02 → P4-01 → P4-02 → P4-03 → P4-04
                                   P4-03 → P4-05
                  P4-01 → P4-06

Phase 5: P2-07 → P5-01 → P5-02 → P5-03
         P1-04 → P5-04
         P2-08 → P5-05
         P0-01 → P5-06
         P0-04 → P5-07
```
