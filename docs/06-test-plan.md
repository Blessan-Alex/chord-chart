# Document 6 — Test Plan

## 6.1 Unit Tests — ✅ DONE

**Framework:** Vitest  
**Location:** `webmvp/src/lib/*.test.ts` (colocated, not `__tests__/`)  
**Run:** `npm run test` — **49+ unit tests** (Vitest)

### 6.1.1 Engine Tests (`engine.test.ts`) — ✅ DONE

| Test | Status |
|---|---|
| `transposeChord("C", "C", "G")` → `"G"` | ✅ |
| `transposeChord("F", "C", "G")` → `"C"` | ✅ |
| `transposeChord("Am", "C", "G")` → `"Em"` | ✅ |
| `transposeChord("G/B", "C", "D")` → `"A/C#"` | ✅ |
| `transposeChord("F#m", "A", "C")` → `"Am"` | ✅ |
| `chordToDegree`, `parseChord`, `isValidChord`, `getDiatonicChords` | ✅ |

### 6.1.2 Editor Parser (`editorParser.test.ts`) — ✅ DONE

Includes regression: `"He said:"` stays lyric, `"Chorus:"` becomes section header.

### 6.1.3 Validation (`validation.test.ts`) — ✅ DONE

| Test | Status |
|---|---|
| `validateSong(valid)` → `{ ok: true }` | ✅ |
| Missing title, bad key, invalid chord | ✅ |
| `validateSession` | ✅ |

### 6.1.4 Utilities (`formatError.test.ts`) — ✅ DONE

Error, string, and Event object cases.

---

## 6.2 Integration Tests — ✅ (emulator required)

**Framework:** Vitest + Firebase Emulator Suite  
**Location:** `webmvp/src/lib/__tests__/integration/` (or colocated `*.integration.test.ts`)

**Ticket:** P1-09 — schedule in Phase 1, not Phase 5.

### Setup

```bash
firebase emulators:start --only firestore,auth
npm run test -- --grep integration
```

### 6.2.1 Song CRUD (`songs.integration.test.ts`) — Ticket P1-02

Create, read, archive (soft-delete), paginated list. **No prefix search tests** — search is client-side index.

### 6.2.2 Session CRUD (`sessions.integration.test.ts`) — Ticket P3-01 — ✅

Create session, add songs, fractional reorder, publish.

### 6.2.3 Song Edit Workflow (`songEdits.integration.test.ts`) — Ticket P4-01

Create draft, `publishDraft` transaction, `baseVersion` conflict, discard.

### 6.2.4 Security Rules (`rules.integration.test.ts`) — Ticket P1-09

| Test | Expected |
|---|---|
| Anon read songs | Denied |
| Musician read active song | Allowed |
| Musician write song | Denied |
| Admin write song (custom claim) | Allowed |
| Musician self-create `users/{uid}` | Allowed with `role: musician` |
| Musician set `role: admin` on update | Denied |
| Musician read `songEdits` | Denied |

> Use **custom claims** in emulator tests, not Firestore `users.role` for admin checks.

---

## 6.3 E2E Tests — ✅ Smoke + viewports

**Framework:** Playwright  
**Location:** `webmvp/e2e/`  
**Run:** `npm run build && npm run test:e2e`

| Spec | Coverage |
|---|---|
| `smoke.spec.ts` | Home, login, import routes (chromium, mobile-chrome, tablet) |
| `auth.spec.ts` | Optional sign-in when `E2E_USER_EMAIL` + `E2E_USER_PASSWORD` set |

---

## 6.4 CI — ✅

GitHub Actions (`.github/workflows/ci.yml`): `typecheck`, `lint`, `test`, `build`, emulator integration job, Playwright smoke on PR.

---

## 6.5 Performance & offline

See `docs/08-cost-budget.md` for read budgets. Dev read counter spec in ARCHITECTURE.md.

| Check | Target |
|---|---|
| Index fetch | ≤ 5 reads |
| Search keystroke | 0 reads |
| Song detail (cached) | 0 reads |
| Song detail (miss) | 1 read |

---

## 6.6 Test file structure (current + planned)

```
webmvp/
├── src/lib/
│   ├── engine.test.ts           ✅
│   ├── editorParser.test.ts     ✅
│   ├── validation.test.ts       ✅
│   ├── formatError.test.ts      ✅
│   ├── firestore/songIndex.test.ts ✅
│   └── __tests__/integration/   ✅ (emulator)
├── e2e/                         ✅
├── vitest.config.ts             ✅
└── playwright.config.ts         ✅ (chromium + mobile + tablet)
```
