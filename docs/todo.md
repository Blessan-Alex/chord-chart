I read every source file, both doc trees, and verified the build state (`tsc --noEmit` clean, `next build` clean, 111 kB first-load JS). Here's the audit.

**TLDR:** The MVP is small, clean, and genuinely well-typed — the transposition engine and the position-indexed chord model are production-grade and should survive untouched into Firebase. The `@docs` plan is above-average for this stage, but it has **four free-tier blockers** that would stall you mid-Phase-0: it depends on Cloud Functions in three places (not available on Spark), its search design can't find "Way Maker" when you type "maker", it has no App Check and no deployment ticket, and its "offline" story caches data but not the app. Fix those in the plan before writing any Firebase code.

---

# A) Executive Summary

- **Health score: 6/10.** As a *prototype* it's an 8 — tiny, typed, no `any`, no dead dependencies, builds clean. As a *foundation for a production musician app* it's a 5 — no tests, no README, no validation, no persistence layer that survives 10k songs.
- **Risk 1 — The plan assumes a paid tier without saying so.** `users` docs are `allow create: if false` "handled by Cloud Function", `meta` is `allow write: if false` "Cloud Functions only", and orphan cleanup has no owner. Cloud Functions require Blaze. On Spark, **no new musician can ever get a profile document**, so `isAdmin()` and every role check fail. The app is unusable past user #1 without manual console work per person.
- **Risk 2 — Search won't survive 10k songs.** `docs/01` promises "free-text search (title + artist)"; `docs/02`/`docs/04` deliver a `titleLower >= prefix` range query. Prefix-only means "maker" never finds "Way Maker", artist search doesn't exist, and every debounced keystroke costs 20 document reads against a 50k/day budget.
- **Risk 3 — Everything is one `git checkout` from gone.** The repo has exactly one commit (`68ad1c0`). All current work — `InteractiveEditor.tsx`, `ChordLine.tsx`, `editorParser.ts`, the entire `docs/` plan, and six file deletions — is uncommitted. There are also zero tests, no CI, and no backup path (scheduled Firestore export needs Blaze).
- **Strength 1 — `src/lib/engine.ts`.** Pure, React-free, correctly handles enharmonic spelling per target key, parses slash chords and suffixes, and is ~130 lines. This is the asset of the codebase and ports verbatim to Flutter later.
- **Strength 2 — The chord/lyric data model.** `Song → Section[] → LyricLine → ChordMark{chord, position}` is the right call over inline ChordPro, and `docs/02` mirrors it exactly, so the Firestore migration is genuinely low-risk.
- **Strength 3 — Discipline in the small things.** `strict: true`, zero `any`, zero `@ts-ignore`, one stray `console.error` (correctly placed in an error boundary), no unused npm dependencies, and `formatError.ts` shows someone actually root-caused the `[object Event]` bug instead of patching around it.
- **Verdict: Needs foundation work first — but only about a week of it.** Roughly 8 small fixes in the code and 6 corrections to the plan, then it's ready to build on.

---

# B) Detailed Findings

## 1. Project structure & hygiene

**Good**
- `src/app` / `src/components` / `src/lib` / `src/data` is the right split and matches what `docs/04` §4.4 proposes, so the plan drops in without reorganizing.
- `@/*` path alias configured in `tsconfig.json` and used consistently — no `../../..` imports anywhere.
- Root `.gitignore` is thorough and correctly ignores `.env`, `.env.*`, `*.pem`, `*.key`, and `node_modules/` at any depth.

**Bad**
- **No README anywhere.** Neither the repo root nor `webmvp/` has one. A new dev cannot discover `npm run dev`, the port, or the fact that data lives in a `lf-chord-app-songs` localStorage key.
- **`npm run lint` is broken in practice.** The script is bare `eslint` with no target and `eslint.config.mjs` has no `ignores`, so it lints `.next/` build output. I got ~1,700 warnings about `__webpack_require__` and zero signal about actual source. Point it at `src scripts` or add `ignores: [".next/**", "out/**"]`.
- **`scripts/verify-engine.ts` cannot be run.** It's a well-written assertion script, but there's no `tsx`/`ts-node` dependency and no npm script to invoke it. It is effectively documentation.
- ~~**Two contradictory doc trees.**~~ Fixed in Phase 2 — deleted `webmvp/docs/{PLAN,SRS,WHAT-WE-ARE-BUILDING}.md`; rewrote `tickets/MAP.md`.
- ~~Six legacy component files deleted~~ — commit the deletions when ready.
- ~~`webmvp/assets/ui inspo.jpeg`~~ — moved to `docs/assets/ui-inspiration.jpeg`.

**Security loophole**
- `docs/07` §7.1 tells you to place `./serviceAccountKey.json` in `scripts/`. Root `.gitignore` ignores `*.key` and `*.pem` but **not `*.json`** — so that file would be committed. A leaked service account key is full read/write/delete on your entire Firestore, bypassing every rule you wrote in `docs/03`.

## 2. Code quality & best practices

**Good**
- `engine.ts` and `formatError.ts` are exemplary: pure functions, explicit return types, no React coupling, documented intent.
- Props are typed with local `type X = {...}` declarations on every component. No implicit `any` reaches a component boundary.
- Both `app/error.tsx` and `app/global-error.tsx` exist with recovery actions — better error-boundary coverage than most MVPs.

**Bad — rendering**
- **Two incompatible chord renderers for the same data.** `ChordLine.tsx` builds a space-padded monospace *string* (`buildChordRow`, lines 27–56); `InteractiveEditor.tsx` uses absolutely-positioned divs at `left: ${position}ch` (line 139). What the editor shows you is not what the song view renders. Consolidate on one before adding features on top.
- `buildChordRow` silently loses alignment whenever a chord gets wider. Transposing `C` → `C#`, or switching to numbers view where `I` becomes `bVII`, pushes every subsequent chord right by the overflow. In numbers mode this is systemic, not an edge case.

**Bad — state**
- **`InteractiveEditor` mutates previous state.** In `commitChord` (lines 60–84) it shallow-copies the section object but then writes `section.lines[lIndex] = line` — `lines` is still the array owned by the previous state. Same pattern in `removeChord` (lines 89–99). It works today only because the top-level array identity changes; it will misbehave under `React.memo` or StrictMode double-invocation.
- The component is ~240 lines doing four jobs: chart rendering, word-click hit-targeting, the modal, and the chord palette. Split into `ChordChartEditor` + `ChordEntryModal`.

**Bad — data integrity (the important one)**
- **`getDiatonicChords()` can write invalid chords into songs.** It's a hardcoded map covering only C/G/D/A/E/F; `originalKey` of `Bb`, `Eb`, `Ab`, `B`, `C#`, or `F#` hits the fallback `[key, "m", "7", "sus4", "maj7"]`. Clicking the "m" button stores the literal chord `"m"`. `safeTranspose` in `ChordLine.tsx` then swallows the parse error and renders `m` forever. You already have the interval math to derive this properly.
- **No chord validation exists anywhere.** The free-text input at `InteractiveEditor.tsx:184` accepts anything.
- **`saveSong` de-duplicates by normalized title** (`storage.ts:76–83`). Two different arrangements of "Amazing Grace" silently overwrite each other. This must not be carried into `createSong()` in Firestore.
- **`writeSongs` has no try/catch** (`storage.ts:31–37`). localStorage is ~5 MB; at ~3 KB/song that's a hard wall around 1,500 songs, and `QuotaExceededError` throws uncaught straight through the save handler. It's also a full read-modify-write of the entire array on every save, and `getSongs()` is re-read 2–3 times per operation.
- **Unchecked cast on read**: `return parsed as Song[]` (`storage.ts:25`). Any hand-edited or partially-written localStorage value crashes the render.
- **`parseRawLyrics` misclassifies lyrics as headers.** The pattern `^(.*?):$` (`editorParser.ts:17`) turns any lyric line ending in a colon into a section label. It also drops blank lines, losing stanza breaks. And it never extracts chords — so a user pasting ChordPro (`[C]Amazing grace`) into `/import` gets literal brackets as lyrics, even though `presets.ts`'s `L()` helper parses exactly that format. Two parsers, one format, inconsistent behavior.

**Performance**
- No memoization anywhere. Fine at 10 songs; `ChordLine` recomputes every chord on every key change, so memoize on `(chords, fromKey, toKey, viewMode)` once songs get long.
- `HomePage.tsx` renders the full list with no pagination, virtualization, or search input. At 10k songs this is a non-starter — but it's also exactly what `docs/05` P2-01/P2-07 fix, so it's a known gap rather than a surprise.

**State management**
- All local `useState`, no context, no prop drilling. Correct for the current size. The plan adds exactly one legitimate context (auth) — resist adding more.

**Error/UX states**
- Not a single `try/catch` around any storage call.
- `/song/[id]` has a `Loading…` state and a "Song not found" state — good. `HomePage` has neither an empty state (it just hides the "Your Songs" section) nor an error state.
- Delete uses native `confirm()` (`HomePage.tsx:16`) — blocking, unstyled, and suppressed in some embedded/PWA contexts.

## 3. Firebase / Firestore integration

**There is none yet.** `package.json` has no `firebase` dependency, no `firebase.json`, no `firestore.rules`, no `firestore.indexes.json`, no `.env.example`. This is expected — the plan starts at P0-01 — so the real assessment is of the plan, in section E below.

One structural note that affects hosting: `next build` reports `/song/[id]` as **ƒ (Dynamic, server-rendered on demand)**. Every page is `"use client"` and all data loading is client-side, so static export is *almost* viable — but a dynamic segment with no `generateStaticParams` will 404 under `output: 'export'`. This decides your free hosting options (see R10).

## 4. Features & flows

**Works end-to-end**
- Browse presets → open song → transpose to any of 12 keys → toggle chords/numbers. Solid.
- Import: title + key + paste lyrics → click words to place chords → save → redirect to detail. Works.
- Deep links work for both preset ids and generated song ids.
- Delete saved songs from the home list.
- Dark mode via `prefers-color-scheme`, sticky header, `min-h-11` touch targets, safe-area insets in `layout.tsx`. The mobile polish is real.

**Missing or partial**
- No search, no filter, no sorting control. No sessions/setlists of any kind — the single most important feature for the stated product.
- **No edit-existing-song route.** `MAP.md` lists it under "Not yet specified". You can create a song and never change it.
- No auth, no roles, no offline indicator, no loading skeletons.
- **Latent bug:** `saveSong` assigns `id: song.presetId || ...` (`storage.ts:99–103`) while `HomePage` filters out any song with a `presetId` (line 24). The moment you add "edit a preset", the edited song vanishes from the home list.

## 5. Documentation

**Good** — the new `docs/` tree is the strongest artifact in the repo: seven documents, a 36-ticket plan with a dependency chain, a complete rules file, an index list, and five example JSON documents. `docs/02` correctly justifies the subcollection-vs-array and flat-`songEdits` decisions.

**Bad**
- No README, no env var documentation, no run/build/deploy commands, no onboarding path.
- No architecture note explaining how `engine.ts` + `ChordLine` + the position model fit together — the one thing a new dev genuinely needs.
- `webmvp/docs/*` and `tickets/MAP.md` actively contradict both the code and `docs/`.
- The plan is clear and actionable in intent, but see E for where it diverges from what's buildable on the free tier.

## 6. Testing & reliability

- **Zero automated tests.** One unrunnable assertion script (`scripts/verify-engine.ts`). No Vitest, no Playwright, no `.github/workflows`, no CI, no documented manual QA beyond closed ticket 008.
- **Testability is excellent, though** — `engine.ts`, `editorParser.ts`, `formatError.ts`, and `storage.ts` are pure or trivially isolatable. You could get meaningful unit coverage in about two hours.
- `docs/06` is a good test plan, but **no ticket in `docs/05` ever installs a test framework.** The plan schedules testing nowhere except P5-07 (rules only). Plans that don't schedule tests don't get tests.

## 7. Dead code & tech debt

- Debt is genuinely low: one `console.error` (appropriate), no `TODO`/`FIXME`, no commented-out blocks, no unused dependencies, no version conflicts. Next 15.5 / React 19 / Tailwind 4 are all current.
- The debt that exists is the **stale documentation** and the **uncommitted deletions**, not the code.

---

# C) Dead Code & Cleanup List

- ~~`webmvp/docs/{PLAN,SRS,WHAT-WE-ARE-BUILDING}.md`~~ — deleted (Phase 2).
- ~~`webmvp/tickets/MAP.md`~~ — rewritten (Phase 2).
- `storage.ts` → `findSongByPresetId` — exported, zero callers.
- `storage.ts` → `findSongByTitle` — exported, zero callers, and encodes the title-collision bug.
- `storage.ts` → `findExistingSongIndex` title-matching branch (lines 76–84) — delete the title fallback, keep id/presetId matching.
- `InteractiveEditor.tsx` → `getDiatonicChords` — replace with an engine-derived function, don't extend the hardcoded map.
- ~~`types.ts` → `Song.presetId`~~ — removed (Phase 2).
- ~~Legacy component deletions~~ — commit when ready.
- ~~`webmvp/assets/ui inspo.jpeg`~~ — moved to `docs/assets/ui-inspiration.jpeg`.
- `.next/` from lint scope — not a file, but the highest-noise item in the repo.

---

# D) Best-Practice Gaps & Recommendations

**Security**
- Add `serviceAccountKey.json`, `*-serviceaccount*.json`, and `**/serviceAccount*.json` to `.gitignore` **before** anyone follows `docs/07` §7.1. Better: use `GOOGLE_APPLICATION_CREDENTIALS` pointing outside the repo entirely.
- Put Firebase config in `NEXT_PUBLIC_FIREBASE_*` env vars with a committed `.env.example`. The config isn't secret, but hardcoding it welds you to one project and blocks an emulator/staging switch.
- **Enable App Check (reCAPTCHA v3 — free).** Your web config is public by design. Without App Check, anyone who views source can drain your 50k daily reads and your app is dead until midnight UTC.
- Move the admin check to **Auth custom claims**, not a Firestore `get()` (see R2).

**Performance / free-tier economy**
- Build the **library index** described in R4. It's the single highest-leverage change in this entire audit.
- Hard rule: **no `onSnapshot` on any collection query.** Use `getDocs` for lists, reserve listeners for the one active session view. Every listener re-delivery is billed reads.
- Read `getDocFromCache` first for song detail, fall back to server. Chord charts change monthly, not hourly.
- Use fractional ordering for `sessionSongs.order` so a drag-reorder costs 1 write instead of N (R7).

**Maintainability**
- `src/lib/firestore/*.ts` as pure, typed, React-free SDK modules exactly as `docs/04` §4.4 proposes — that part of the plan is right, keep it.
- Add `src/lib/validation.ts` with hand-rolled validators (`validateSong`, `validateSession`) called before every write. Skip zod; it's ~13 KB gzipped for something you need in four places, and `docs/06` already specifies the test cases.
- Narrow `originalKey` from `string` to the `Key` union already exported by `engine.ts`, and mirror it in rules with `in ['C','C#',...]`.
- One chord renderer, shared by `ChordLine` and the editor.
- Add npm scripts: `typecheck`, `test`, `verify`. Anything without a script doesn't get run.

---

# E) Alignment Check with the `@docs` Plan

## What matches reality and should not change

- The Firestore `songs` schema mirrors `types.ts` exactly. The migration really is low-risk, as `docs/README.md` claims.
- Keeping `engine.ts` untouched (`docs/01` §1.2 Flow 2) is correct.
- `sessionSongs` as a subcollection rather than an array — right call, well justified.
- Reusing the `L()` ChordPro parser for bulk import (`docs/07` §7.4) — correct, and it's the parser that actually works.
- Denormalizing `songTitle` and `songCount` — correct for read economy.
- `docs/04` §4.4's service-layer split (`firestore/` pure, `hooks/` React) — genuinely good architecture, portable to Flutter later.

## What must change in the plan (numbered so you can act on them)

**R1 — Spark tier has no Cloud Functions. Three parts of the plan depend on them.**
`docs/03` sets `users` to `allow create: if false` ("handled by Cloud Function") and `meta` to `allow write: if false` ("Cloud Functions only"); `docs/02` says `meta/stats` is "maintained via Cloud Function". On the free tier none of this can run, so **a new musician can never get a profile document, which means `isAdmin()` and every role-dependent path fail.** P0-06 hides this by creating one admin by hand.
*Fix:* allow self-create of one's own profile with the role pinned, e.g. `allow create: if isOwner(uid) && request.resource.data.role == 'musician'`, and make `role` immutable on update. Promote admins with a local Admin SDK script. Write `meta/stats` from the same seed script (Admin SDK bypasses rules) or drop `meta` entirely for now.

**R2 — `isAdmin()` costs a billed read on every evaluation.**
`get(/databases/$(db)/documents/users/$(uid)).data.role` is a document read each time it runs — on every admin write *and* on every `songEdits` read, since drafts are admin-read. Browsing version history doubles its own cost.
*Fix:* use a custom claim — `request.auth.token.admin == true` — set once per admin by a local script. Zero reads, works on Spark, and simplifies every rule.

**R3 — `docs/03` contains two different rules files that disagree.**
§3.3 has field validation including `request.resource.data.version == resource.data.version + 1`; §3.4's "Full Rules File" has none. Meanwhile `updateSong()` in `docs/04` applies `increment(1)` to *every* update, so a tempo tweak bumps the version and collides with the draft workflow's version semantics.
*Fix:* ship one file. Validate *shape* (`title is string`, `originalKey in [...]`, `sections is list`), not version arithmetic. Let only `publishDraft` set `version`.

**R4 — Search is the plan's biggest scaling flaw.** *(highest-value fix)*
`docs/01` promises free-text title + artist search; `docs/02`/`docs/04` implement `titleLower >= prefix`. So "maker" misses "Way Maker", artist is unsearchable, and each debounced keystroke costs 20 reads.
*Fix — and this is the free-tier unlock:* have the seed/import script also write a **library index**: `songIndex/{chunk0..n}`, each holding ~2,000 entries of `{id, title, artist, key, tags}` (~120 KB per document, comfortably under the 1 MB cap). The client fetches 1–5 documents **once**, Firestore persistence caches them in IndexedDB, and all search/filter/sort happens locally with substring matching and **zero reads per keystroke**. At 10k songs: paginated browsing costs 20 reads per page (200 reads for 10 pages of casual browsing); the index costs 5 reads for the entire library, permanently, and works offline. Add this as a Phase-1 ticket and delete P2-01/P2-02/P2-03's query-per-filter approach.

**R5 — The quota math in `docs/07` §7.3 is optimistic.**
"~10 reads per song view → ~5,000 views/day" ignores the list queries, search re-queries, session fan-out, and the `isAdmin()` read. With the planned UI, 20 active users can plausibly cross 50k/day on a busy Sunday.
*Fix:* adopt R4 + R2, ban collection listeners, and add a dev-mode read counter so you see the number before Firebase does.

**R6 — `publishDraft` is not atomic and can destroy work.**
`docs/04` §4.1.3 does `getDoc(songRef)` *outside* the `writeBatch`. Two concurrent publishes, or a draft created from a now-stale version, silently overwrite a published arrangement.
*Fix:* `runTransaction`, and store `baseVersion` on the draft so you can throw a conflict when `song.version !== draft.baseVersion`.

**R7 — `addSongToSession` has a race and a drift bug.**
It derives `order` from a `songCount` read outside any transaction, so simultaneous adds produce duplicate `order` values, and `songCount` drifts permanently with no reconciliation path.
*Fix:* transaction for correctness; and switch `order` to **fractional ordering** (insert at the midpoint between neighbours) so drag-reorder is 1 write instead of N — which matters against a 20k/day write budget. Add a `recountSessionSongs()` repair function since you have no Cloud Function to do it.

**R8 — Deleting a song orphans session references.**
`deleteSong` hard-deletes; `sessionSongs.songId` still points at it; nothing cleans up.
*Fix:* soft-delete (`status: 'archived'` on the song), filter it out of lists, and make session views degrade gracefully on a missing song.

**R9 — "Offline" caches the data but not the app.**
Firestore persistence fills IndexedDB. It does **not** make your URL load with no network. A musician who closes the tab before the service gets a dinosaur, and P3-07's "Cache for Offline" button is misleading.
*Fix:* add a Phase-2 PWA ticket — web app manifest plus a service worker precaching the app shell — and document "Add to Home Screen". Without this, the offline feature doesn't deliver its promise on stage.

**R10 — There is no deployment ticket in all 36.**
And `/song/[id]` builds as a dynamic route, so `output: 'export'` would 404 on unknown ids under Firebase Hosting. Note also that **Firebase App Hosting requires Blaze** — don't plan on it.
*Decide now:* Vercel Hobby (free, keeps dynamic routes, zero code changes) or Firebase Hosting free (requires static export plus moving song detail to `/song?id=` or a catch-all route).

**R11 — App Check is absent from the plan.** Free, and it's what stands between a public client config and a drained daily quota. Add to Phase 0.

**R12 — No backup or export path.** Scheduled Firestore export requires Blaze + GCS. Add `scripts/export-songs.ts` (Admin SDK → JSON into a gitignored folder), run weekly by hand. For a chord library this is the difference between an outage and a catastrophe.

**R13 — `songEdits` grows without bound.** One ~5 KB archive per publish, forever, and every history view reads them. *Fix:* prune to the last 10 versions inside the publish transaction.

**R14 — `docs/06` is never scheduled.** No ticket installs Vitest or Playwright; Phase 5 only covers rules tests. *Fix:* one Phase-1 ticket adding Vitest and porting `scripts/verify-engine.ts`. Emulator tests are free and never touch your quota.

**R15 — No validation module**, despite `docs/06` §6.1.3 testing `validateSong`. Rules can't deep-validate `sections`, so the client must.

**R16 — Several tickets are 3–4 tickets wearing a trenchcoat.** P0-05 (login page + auth context + route protection), P3-03 (session builder: form + song search + add), and P4-03 (draft editor page) each bundle multiple concerns. No ticket names its files or a verification command — that's the main failure mode for cheap models.

**R17 — The plan regresses the solo-user experience.** P1-05 and P2-04 remove localStorage and the preset fallback, putting everything behind a login wall well before sessions exist. Keep presets as seed-only and retain a read-only local fallback through Phase 2.

**R18 — Index list needs a pass.** `songs | titleLower ASC` is a single-field auto index, not a composite. Missing: `sessions | status ASC, date DESC` if you filter published, and anything supporting the artist search `docs/01` promises. Commit `firestore.indexes.json` and let the emulator tell you what's actually needed.

## Genuinely missing pieces

- Edit-from-song-view route (`/song/[id]/edit` is planned in Phase 4 but the MVP has no edit path at all today).
- Session **sharing** is described as a "Share link" in `docs/01` Flow 4, but rules require auth for all reads — so the link only works for existing accounts. Either say so explicitly in the plan or design a public-read session token.
- Set-list printing/PDF export — deferred to the growth roadmap, which is defensible.
- CCLI usage reporting — same, but note it needs per-session usage records captured from day one if you ever want historical data.

---

# F) Prioritized Action Plan

## Phase 0 — Critical (do before writing any Firebase code)

**0.1 Commit everything.** — Commit current work including the six staged deletions. *AC:* `git status` clean; `git log` shows a second commit.

**0.2 Gitignore service-account credentials.** — Add `serviceAccountKey.json`, `**/serviceAccount*.json`, `*-serviceaccount*.json` to root `.gitignore`. *AC:* `git check-ignore -v scripts/serviceAccountKey.json` matches a rule.

**0.3 Fix lint scope.** — Change the `lint` script to target `src scripts` and add `ignores: [".next/**", "out/**"]` to `eslint.config.mjs`. *AC:* `npm run lint` produces zero warnings and completes in under 10s.

**0.4 Fix `InteractiveEditor` state mutation.** — Deep-copy `lines` in `commitChord` and `removeChord` instead of writing into the previous state's array. *AC:* placing and removing chords works identically under `<StrictMode>`.

**0.5 Harden `storage.ts`.** — Wrap `writeSongs` in try/catch with a user-facing quota message; replace `parsed as Song[]` with a shape check that drops malformed entries. *AC:* a corrupt `lf-chord-app-songs` value renders an empty list instead of crashing.

**0.6 Remove title-collision de-duplication.** — Delete the title branch of `findExistingSongIndex`; match only on `id`/`presetId`. *AC:* two songs both titled "Amazing Grace" save as two distinct rows.

**0.7 Validate chord input.** — Add `isValidChord()` to `engine.ts`; block invalid entries in the editor modal with inline feedback. *AC:* typing `xyz` shows an error and does not save; `F#m7/C#` saves.

**0.8 Decide and record the hosting target.** — Choose Vercel Hobby or Firebase Hosting + static export; record it in `next.config.ts` and the README. *AC:* a one-command deploy produces a working URL where `/song/[id]` resolves.

## Phase 1 — Foundation hardening

**1.1 Single chord renderer.** — Extract one `<ChordRow>` used by both `ChordLine` and the editor, absolutely positioned in `ch` units. *AC:* a song with `bVII` in numbers view stays aligned; editor preview matches song view pixel-for-pixel.

**1.2 Engine-derived chord palette.** — Replace `getDiatonicChords`'s hardcoded map with interval math over all 12 keys. *AC:* every key in `ALL_KEYS` yields 6 valid diatonic chords; no palette button can produce an unparseable chord.

**1.3 `src/lib/validation.ts`.** — Hand-rolled `validateSong` / `validateSession` per `docs/06` §6.1.3, called before every write. *AC:* the test cases in `docs/06` §6.1.3 pass.

**1.4 Extend types to the Firestore shape.** — Add the `docs/02` fields and narrow `originalKey` to the `Key` union. *AC:* `tsc --noEmit` clean; no component changes required.

**1.5 `src/lib/firestore/` modules.** — Typed, React-free `songs.ts` / `sessions.ts` / `sessionSongs.ts` / `songEdits.ts`, with `publishDraft` and `addSongToSession` as transactions (R6, R7) and fractional ordering. *AC:* two concurrent `publishDraft` calls — one succeeds, one throws a conflict.

**1.6 Auth with custom claims.** — Login page, `AuthProvider`, `useAuth`, self-created `users/{uid}` with role pinned to `musician`, plus `scripts/set-admin.ts` for claims (R1, R2). *AC:* a brand-new account signs up with no console intervention and reads songs; `request.auth.token.admin` gates writes with zero extra reads.

**1.7 Ship the Firebase config as code.** — One `firestore.rules` (R3), `firestore.indexes.json`, `firebase.json`, emulator config, `.env.example`, and App Check enabled (R11). *AC:* `firebase deploy --only firestore` succeeds; emulators start from the committed config.

**1.8 Library index + local search.** — Seed script writes `songIndex/{chunk}` docs; add `useSongSearch` doing substring match over the cached index (R4). *AC:* typing "maker" finds "Way Maker" in under 100ms and costs zero reads after first load; works in airplane mode.

## Phase 2 — DX & docs

**2.1 `webmvp/README.md`.** — Setup, env vars, `dev`/`build`/`test`/`deploy`, and where data lives. *AC:* a new dev goes from clone to running app using only the README.

**2.2 Retire the stale doc tree.** — ~~Delete `webmvp/docs/{PLAN,SRS,WHAT-WE-ARE-BUILDING}.md`; rewrite `tickets/MAP.md` against current reality.~~ Done.

**2.3 `docs/ARCHITECTURE.md`.** — One page plus a diagram: the chord position model, the engine's role, the data flow from Firestore module → hook → component. *AC:* explains why chords are position-indexed rather than inline.

**2.4 Prune dead exports.** — Remove `findSongByPresetId`, `findSongByTitle`, and `Song.presetId`; relocate the stray asset. *AC:* lint reports no unused exports; build still clean.

**2.5 Ticket template.** — Every ticket names the exact files it touches (max 1 created, 2 modified) plus a verification command (R16). *AC:* template committed and P0-05, P3-03, P4-03 re-split into 3 tickets each.

**2.6 PWA shell.** — Manifest plus a service worker precaching the app shell (R9). *AC:* with the network fully disabled and the tab closed, reopening the app loads and renders a cached session.

**2.7 `docs/08-cost-budget.md`.** — Honest read/write math per screen and the Spark ceiling (R5), with a dev-mode read counter. *AC:* a table of reads per user action, and an alert threshold you'd actually notice.

**2.8 `scripts/export-songs.ts`.** — Manual Admin SDK backup to gitignored JSON (R12). *AC:* one command produces a restorable dump of `songs` and `sessions`.

## Phase 3 — Test coverage

**3.1 Vitest setup + port the engine script.** — Add Vitest, convert `scripts/verify-engine.ts` to `engine.test.ts`, add a `test` script. *AC:* `npm test` runs and all existing assertions pass.

**3.2 Pure-module unit tests.** — `editorParser.test.ts`, `utils.test.ts` (formatError), `validation.test.ts` per `docs/06` §6.1. *AC:* includes a regression test that a lyric line ending in `:` is *not* treated as a section header.

**3.3 Security rules tests on the emulator.** — The eleven cases in `docs/06` §6.2.4, adapted for custom claims. *AC:* all pass against the committed `firestore.rules`; zero production quota consumed.

**3.4 Firestore module integration tests.** — Emulator-backed tests for songs, sessions, and the draft workflow. *AC:* includes the concurrent-publish conflict case from R6 and the duplicate-`order` case from R7.

**3.5 Playwright smoke tests.** — Two flows only: browse → open → transpose, and import → save → view. *AC:* both green headless in under 60s.

**3.6 GitHub Actions CI.** — Free tier: typecheck + lint + unit tests on every push. *AC:* the badge is green and a failing test blocks the merge.

**3.7 Quota regression guard.** — A dev-mode wrapper counting Firestore reads per page, asserted in the Playwright smoke run. *AC:* loading the song list costs a documented, asserted number of reads; a regression fails CI.

---

**If you only do four things:** commit the work (0.1), fix the `users`-creation rule so signup works without Cloud Functions (R1), replace prefix search with the cached library index (R4), and make `publishDraft` a transaction (R6). Those four are the difference between a plan that stalls in week two and one that ships on the free tier.