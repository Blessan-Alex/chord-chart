# Flutter Phase 8 — Release sign-off

**Status:** **BLOCKED** — do not upload to Play internal testing until status is **APPROVED FOR BETA**.

**Last updated:** 2026-03-23  
**Auditor:** Phase 8 Phase A agent (automated code + doc audit; manual scripts not executed)  
**Binary scope:** Phases **1–7** in repo (`main` @ `6fa06b8` and later) — **groups included** in this beta candidate.

---

## Gate rules (non-negotiable)

| Rule | Current |
|------|---------|
| Play internal upload | **Forbidden** until **APPROVED FOR BETA** |
| P0 parity gap | Must fix in owning phase **or** product waiver with evidence in [`flutter-phase-8-parity-audit.md`](flutter-phase-8-parity-audit.md) §A7 |
| Release engineering (signing, App Links, store) | Phase B only after Phase A exit (**READY FOR RELEASE ENGINEERING**) |

---

## Build metadata (release candidate — not yet built for store)

| Field | Value |
|-------|--------|
| `pubspec.yaml` version | `1.0.0+1` |
| Git reference | `main` (Phase 7 + shell nav fix pushed) |
| Build type exercised in audit | **Debug** (`flutter test`, `flutter analyze` on dev machine) |
| **Release-signed AAB** | **Not produced** |
| Play track | **None** |
| Release SHA-256 (App Links / Firebase) | **Not registered for release** |
| `JOIN_API_BASE_URL` release smoke | **Not run on release build** |

---

## Linked artifacts

| Document | Purpose |
|----------|---------|
| [`flutter-phase-8-parity-audit.md`](flutter-phase-8-parity-audit.md) | Master parity evidence (Phase A) |
| [`flutter-phase-8-release.md`](flutter-phase-8-release.md) | Phase B engineering plan |
| [`flutter-web-app-map.md`](flutter-web-app-map.md) | Web behavior truth |
| Per-phase web reports | `docs/flutter-phase-*-web-*-report.md` |

---

## P0 summary

| Metric | Count |
|--------|------:|
| **Open P0 (parity + beta gate)** | **12** |
| Open P1 | 8 |
| Product waivers signed | 0 |

**Last manual script run:** None recorded (Phase A — scripts pending).  
**Last build type:** Debug analysis only.

---

## Checklist — Phase 8 §2 (release readiness)

Run on **release-signed physical device**. All rows **FAIL** until executed and signed.

| § | Area | Release build? | Status |
|---|------|----------------|--------|
| 2.1 | Auth & onboarding | — | **FAIL** — not run |
| 2.2 | Profile & shell | — | **FAIL** — not run |
| 2.3 | Library | — | **FAIL** — not run |
| 2.4 | Song chart | — | **FAIL** — not run |
| 2.5 | Performance | — | **FAIL** — not run |
| 2.6 | Playlists & join | — | **FAIL** — not run |
| 2.7 | Offline & connectivity | — | **FAIL** — not run |
| 2.8 | Automated tests | Debug CI local | **PASS** — `flutter test` 97/97 (2026-03-23) |
| 2.9 | Security anti-patterns | Code review | **PASS** — no admin/import/edit routes |
| 2.10 | Groups (in binary) | — | **FAIL** — not run (two-account) |
| 2.11 | Regression sign-off | — | **FAIL** — no tester names |

---

## Checklist — Phase 8 entry criteria (§0)

| Gate | Status |
|------|--------|
| Phases 1–6 DoD checked in phase docs | **FAIL** — DoD boxes largely unchecked in phase markdown |
| Phase 7 DoD (groups in binary) | **FAIL** — manual + doc checkboxes open |
| `mobile/pubspec.yaml` deps per Appendix A | **PASS** — Firebase, Firestore, go_router, etc. present |
| Firestore offline persistence | **PASS** — enabled in app init (Phase 1–2) |
| `JOIN_API_BASE_URL` documented | **PARTIAL** — `mobile/README.md` references defines; release smoke missing |
| No admin / song writes on mobile | **PASS** — grep + routing |
| Domain unit tests (map §5 v1 Yes) | **PASS** — see audit §A5 |
| **§1.1 matrix all Yes rows verified** | **FAIL** — manual + deep links + release auth |
| `.github/workflows/flutter.yml` | **FAIL** — not present (only `webmvp` CI) |
| Release signing (not debug) | **FAIL** — `build.gradle.kts` uses debug for release |

---

## Phase A exit criteria

| Criterion | Status |
|-----------|--------|
| Gap register zero **open P0** (or waivers) | **FAIL** — 12 open P0 |
| Sign-off → **READY FOR RELEASE ENGINEERING** | **FAIL** — remains **BLOCKED** |

---

## Approval block

| Role | Name | Date | Decision |
|------|------|------|----------|
| Mobile lead | | | |
| Product | | | |
| QA | | | |

**Decision:** ☐ **APPROVED FOR BETA** ☐ **BLOCKED**

**Open items if blocked:** See parity audit §A7 IDs P0-001 … P0-012.

---

## When approved (Phase B completion)

Update this file with:

- Release AAB `versionCode`, upload date, Play internal track URL  
- `assetlinks.json` SHA-256 source (Play **app signing** cert)  
- All §2 scripts **PASS** with tester + date  
- Link to `docs/mobile-qa-checklist.md` or README QA section  
- Set status **APPROVED FOR BETA** only after human explicit “ship”

---

*Phase B must not start store upload until Phase A exit and user review of parity audit.*
