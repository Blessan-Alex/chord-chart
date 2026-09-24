# Flutter Phase 10 — Admin sign-off (Phase C)

**Status:** **NOT STARTED** — blocked on Phase B completion + product gate  
**Parent:** [`flutter-phase-10-admin.md`](flutter-phase-10-admin.md) §6 DoD  
**Parity report:** [`flutter-phase-10-web-admin-report.md`](flutter-phase-10-web-admin-report.md)

---

## Product gate (pre-requisite)

| # | Gate | PASS/FAIL |
|---|------|-----------|
| 1 | Musician v1.1 shipped (Phase 9) or waived | |
| 2 | Church approved admin on mobile | |
| 3 | Test admin claim user(s) exist | |

---

## DoD sign-off (§6)

| # | Criterion | PASS/FAIL | Notes |
|---|-----------|-----------|-------|
| 1 | Non-admin: no admin UI; admin: dashboard | | |
| 2 | Dashboard counts match web | | |
| 3 | Archive removes song from musician search | | |
| 4 | Import: 3 fixture songs, chord positions vs web | | |
| 5 | Edit publish round-trip vs web | | |
| 6 | Version conflict copy + reload | | |
| 7 | Placement editor 360dp usable | | |
| 8 | `flutter test` green (songEdits, createSong, parsers) | | |
| 9 | App Check + rules QA | | |

---

## Additional gates

| Check | PASS/FAIL | Notes |
|-------|-----------|-------|
| Phase 8 §2.9 musician regression (no admin leakage) | | |
| Store track decision (internal vs public) | | |

**Build tested:**  
**Testers:**  
**Date:**
