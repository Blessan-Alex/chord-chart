# LF ChordApp — Project Status

> Last updated: after Phase 5 polish (presets → Firestore-only library, admin delete).

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

---

## 🔲 Next — Phase 3 Sessions (P3-01–P3-08)

| Ticket | What |
|--------|------|
| P3-01 | `sessions.ts` + `sessionSongs.ts` |
| P3-02 | Session list page |
| P3-03 | Session builder (admin) |
| P3-04 | Add to session from song view |
| P3-05 | Session view (band) |
| P3-06–P3-08 | Key overrides, offline cache, fractional reorder |

---

## 🔲 Later

| Phase | Items |
|-------|--------|
| Phase 4 | Draft/publish edit workflow (P4-01–P4-06) |
| Phase 2 gaps | P1-06 admin pagination, P2-08 offline banner, P2-09 PWA, P2-10 export backup |
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
```
