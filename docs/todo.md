# LF ChordApp — Project Status

> Last updated: after Phase 4 + P2-08–P2-10.

---

## ✅ Complete

### Phases 0–3 — MVP foundation
- Chord model, `ChordRow`, engine, validation, storage hardening
- Vitest unit tests + integration tests (emulator)
- Doc cleanup, lint/typecheck

### Docs (R1–R18)
- `ARCHITECTURE.md`, `08-cost-budget.md`, plans `02`–`08`

### Phase 5a — Firebase config
- [x] Firebase project `song-db-5e4ed`, Auth + Firestore
- [x] `firebase.ts`, persistence, emulators, rules/indexes deployed
- [x] App Check (Enterprise), Vercel deploy + env vars

### Phase 5b — Firestore modules
- [x] Types, `firestore/songs.ts`, `songIndex.ts`, seed + `rebuild-index`
- [x] `useSongSearch`, emulator rules tests

### Phase 5c — Auth + wire UI
- [x] Login, `AuthProvider`, `useAuth`, self-signup `users/{uid}`
- [x] `set-admin.ts`, Firestore library when signed in, localStorage when signed out
- [x] Admin import, UI gating, songIndex update on create/archive

### Phase 5 polish
- [x] Client presets removed (seed script only)
- [x] Admin delete (archive) on home + song detail
- [x] `ConfirmDialog` replaces `confirm()` for deletes

### Phase 3 — Sessions
- [x] P3-01: `sessions.ts` + `sessionSongs.ts` (fractional reorder, transactions)
- [x] P3-02: `/sessions` list (published + admin drafts)
- [x] P3-03: `/sessions/new` admin create
- [x] P3-04: Add to session from song view (`AddToSessionModal`)
- [x] P3-05: `/sessions/[id]` band view + admin builder
- [x] P3-06–P3-08: Key overrides, offline cache, reorder up/down

### Phase 4 — Chord edit workflow
- [x] P4-01: `songEdits.ts` draft CRUD + `publishDraft` transaction
- [x] P4-02: Edit button on song page → create/open draft
- [x] P4-03: `/song/[id]/edit` with `InteractiveEditor`
- [x] P4-04–P4-05: Publish (version conflict) + discard draft
- [x] P4-06: Version history on song detail (last 10 archives)

### Phase 2 gaps (partial)
- [x] P2-08: `useOnlineStatus` + offline banner
- [x] P2-09: PWA manifest + service worker shell
- [x] P2-10: `export-songs.ts` backup script

---

## 🔲 Later

| Phase | Items |
|-------|--------|
| Phase 2 gaps | P1-06 admin pagination |
| Ops | App Check enforce on Firestore (when stable) |
| CI | Playwright E2E, GitHub Actions |

---

## 🔲 Optional polish

- Edit song from song view
- HomePage richer empty/error states
- Split `InteractiveEditor`, `ChordLine` memoization

---

## Quick commands

```bash
cd webmvp
npm run dev
npm run test
npm run test:integration   # requires emulators
npm run seed               # Admin SDK — seed presets to Firestore
npm run rebuild-index      # Admin SDK — rebuild songIndex from songs
npm run set-admin <email>  # Admin SDK — grant admin claim
npm run export-songs       # Admin SDK — JSON backup to stdout
```
