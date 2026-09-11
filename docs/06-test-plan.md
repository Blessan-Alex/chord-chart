# Document 6 — Test Plan

## 6.1 Unit Tests — ✅ DONE

**Framework:** Vitest  
**Location:** `webmvp/src/lib/*.test.ts` (colocated, not `__tests__/`)  
**Run:** `npm run test` — **37 tests passing** (commit `c9bb044`)

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
| `validateSession` | 🔲 Implement when sessions land |

### 6.1.4 Utilities (`formatError.test.ts`) — ✅ DONE

Error, string, and Event object cases.

---

## 6.2 Integration Tests — 🔲 Phase 1 (P1-09)

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

### 6.2.2 Session CRUD (`sessions.integration.test.ts`) — Ticket P3-01

Create session, add song (transaction), fractional reorder, `recountSessionSongs`.

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

## 6.3 E2E Tests — 🔲 Post-Firebase (no ticket yet)

**Framework:** Playwright  
**Location:** `webmvp/e2e/`  
**Prerequisite:** P0-05 auth, P1-05 wired UI

Key flows: browse → transpose, search ("maker" → Way Maker), import, session builder, offline cache, auth/role gates.

---

## 6.4 CI — 🔲 Future

GitHub Actions: `typecheck && lint && test && build` on PR. Emulator rules tests in separate job. Not in scope until Firebase modules exist.

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
│   └── *.integration.test.ts    🔲 Phase 1
├── e2e/                         🔲 Post-Firebase
├── vitest.config.ts             ✅
└── playwright.config.ts         🔲 Future
```
