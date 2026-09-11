# LF ChordApp — Project Status

> Last updated: after Phase 5a config. Code foundation: **`c9bb044`**. Docs: **`c58a7ee`**.

---

## ✅ Code foundation complete (Phases 0–3)

| Area | Status | Notes |
|---|---|---|
| Chord model + `ChordRow` | ✅ | Position-indexed, shared renderer |
| Engine | ✅ | `transposeChord`, `chordToDegree`, `getDiatonicChords`, `isValidChord` |
| Validation | ✅ | `validateSong` before every write |
| Storage hardening | ✅ | try/catch, shape check, id-only dedup |
| Lint / typecheck | ✅ | `eslint src`, `tsc --noEmit` |
| Vitest | ✅ | 37 tests, `src/lib/*.test.ts` |
| Doc cleanup (webmvp) | ✅ | Stale `webmvp/docs/*` deleted, `MAP.md` rewritten |
| `Song.presetId` removed | ✅ | Presets are read-only seed |
| `.gitignore` service accounts | ✅ | |
| `webmvp/README.md` | ✅ | Setup + scripts |

---

## ✅ Docs plan updated (this session)

Audit fixes **R1–R18** applied to the implementation plan:

| File | Changes |
|---|---|
| `ARCHITECTURE.md` | **NEW** — model, engine, components, future flow, mermaid |
| `08-cost-budget.md` | **NEW** — Spark budgets, per-action reads/writes, Sunday scenario |
| `02-data-model-firestore-schema.md` | `songIndex`, `status`, `baseVersion`, fractional order, retention, indexes |
| `03-security-rules-access-patterns.md` | Single canonical rules; custom claim `admin`; self-signup users; App Check |
| `04-api-client-usage-patterns.md` | Local search, `runTransaction`, soft-archive, cache-first, localStorage fallback |
| `05-phased-implementation-plan.md` | Spark preamble; P0-08/09/10; P1-07/08/09; superseded P2-01–03 |
| `06-test-plan.md` | Unit tests marked DONE; emulator in Phase 1 |
| `07-migration-growth-notes.md` | Credentials outside repo; `L()` for ChordPro; pointer to cost budget |
| `README.md` | 9-document index, Spark constraints, hosting |

---

## 🔲 Implementation backlog

Execute in order after docs merge. See `docs/05-phased-implementation-plan.md` for full tickets.

### Phase 5a — Firebase config ✅ (in repo; deploy requires your Firebase project)
- [x] P0-02: `firebase` + `src/lib/firebase.ts`
- [x] P0-03: `persistentLocalCache` in `getDb()`
- [x] P0-04: `firestore.rules` + `firestore.indexes.json` at repo root
- [x] P0-08: App Check helper `initAppCheck()` + `.env.example`
- [x] P0-09: `vercel.json` + deploy docs in `webmvp/README.md`
- [x] Emulators: `firebase.json` + `npm run emulators`
- [ ] P0-01: Create Firebase project + `firebase use <id>` (manual, Console)
- [ ] P0-04 deploy: `firebase deploy --only firestore` (after P0-01)
- [ ] P0-09 deploy: Vercel import + env vars (manual)

### Phase 5b — Firestore modules
- [ ] P1-01–P1-04: Types, `firestore/songs.ts`, seed + `songIndex`, indexes
- [ ] P1-07: `useSongSearch` hook
- [ ] P1-09: Emulator rules tests

### Phase 5c — Auth + wire UI
- [ ] P0-05–P0-07, P1-08: Auth, custom claims, self-signup
- [ ] P1-05: Firestore when authed, localStorage when not (R17)
- [ ] P2-04–P2-06: Song detail, admin import, UI gating

### Later
- [ ] Sessions (Phase 3 tickets P3-01–P3-08)
- [ ] Draft/publish workflow (Phase 4)
- [ ] P2-09 PWA, P2-10 export backup
- [ ] Playwright E2E, GitHub Actions CI

---

## 🔲 Optional code polish (not blocking Firebase)

| Item | Ticket ref |
|---|---|
| Edit existing song from song view | Optional pre-P4 |
| Replace `confirm()` delete with modal | UX |
| HomePage empty / error states | UX |
| Split `InteractiveEditor` (chart + modal) | Polish |
| `ChordLine` memoization | Performance |

---

## Resolved audit items (reference)

These were blockers in the original audit — now addressed in docs:

| ID | Fix | Doc |
|---|---|---|
| R1 | No Cloud Functions on Spark; self-signup users | `03`, `05` |
| R2 | `isAdmin()` via custom claim, not Firestore `get()` | `03` |
| R3 | Single canonical rules file | `03` |
| R4 | `songIndex` + local substring search | `02`, `04`, `05` |
| R5 | Realistic cost budget | `08` |
| R6 | `publishDraft` `runTransaction` + `baseVersion` | `02`, `04` |
| R7 | Fractional session ordering + `recountSessionSongs` | `02`, `04` |
| R8 | Soft-delete `status: archived` | `02`, `04` |
| R11 | App Check ticket P0-08 | `03`, `05` |
| R12 | Manual `export-songs.ts` backup | `07`, `05` P2-10 |
| R13 | Keep last 10 archives per song | `02` |
| R17 | localStorage fallback when not signed in | `04`, `05` P1-05 |
| R18 | Index list updated | `02` |

---

## Quick commands

```bash
cd webmvp
npm run dev          # local app
npm run test         # 37 unit tests
npm run typecheck && npm run lint && npm run build
```
