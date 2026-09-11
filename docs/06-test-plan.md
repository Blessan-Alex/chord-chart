# Document 6 — Test Plan

## 6.1 Unit Tests

**Framework:** Vitest (already compatible with Next.js + TypeScript)  
**Location:** `webmvp/src/__tests__/`

### 6.1.1 Engine Tests (`engine.test.ts`)

Already verified manually (ticket 008). Formalize as unit tests:

| Test | Input | Expected Output |
|---|---|---|
| `transposeChord("C", "C", "G")` | C in key C → key G | `"G"` |
| `transposeChord("F", "C", "G")` | F in key C → key G | `"C"` |
| `transposeChord("Am", "C", "G")` | Am in key C → key G | `"Em"` |
| `transposeChord("G/B", "C", "D")` | Slash chord | `"A/C#"` |
| `transposeChord("F#m", "A", "C")` | Sharp to natural | `"Am"` |
| `chordToDegree("G", "C")` | G in key C | `"V"` |
| `chordToDegree("Am", "C")` | Minor chord | `"vi"` |
| `parseChord("Bbmaj7")` | Complex chord | `{ rootNum: 10, suffix: "maj7" }` |
| `parseChord("")` | Empty string | Throws error |

### 6.1.2 Editor Parser Tests (`editorParser.test.ts`)

| Test | Input | Expected |
|---|---|---|
| `parseRawLyrics("[Verse 1]\nLine one\nLine two")` | With section header | 1 section labeled "Verse 1", 2 lines |
| `parseRawLyrics("Line one\nLine two")` | Without section header | 1 section labeled "Section 1", 2 lines |
| `parseRawLyrics("[Verse 1]\nLine\n\n[Chorus]\nLine")` | Multiple sections | 2 sections |
| `parseRawLyrics("")` | Empty input | 1 default section with 0 lines |

### 6.1.3 Schema Validation Helpers (`validation.test.ts`)

Create thin validators for Firestore documents:

| Test | Description |
|---|---|
| `validateSong(valid)` | Returns true for complete song object |
| `validateSong(missingTitle)` | Returns false / error for missing required fields |
| `validateSong(badKey)` | Returns false for invalid `originalKey` |
| `validateSession(valid)` | Returns true for valid session |
| `validateSession(badServiceType)` | Returns false for unknown `serviceType` |

### 6.1.4 Utility Tests (`utils.test.ts`)

| Test | Description |
|---|---|
| `formatError(new Error("msg"))` | Returns `"msg"` |
| `formatError("string")` | Returns `"string"` |
| `formatError(event)` | Returns `"Unexpected browser event: ..."` |

---

## 6.2 Integration Tests

**Framework:** Vitest + Firebase Emulator Suite  
**Location:** `webmvp/src/__tests__/integration/`

### Setup

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Start emulators
firebase emulators:start --only firestore,auth
```

### 6.2.1 Song CRUD (`songs.integration.test.ts`)

| Test | Steps | Expected |
|---|---|---|
| Create song | Call `createSong()` with valid payload | Document exists in Firestore, has `version: 1` |
| Read song | Call `getSong(id)` | Returns correct song data |
| Update song | Call `updateSong(id, { tempo: 120 })` | Song has updated tempo |
| Delete song | Call `deleteSong(id)` | `getSong(id)` returns null |
| List songs (paginated) | Create 25 songs, call `listSongs({ pageSize: 10 })` | Returns 10 songs, has cursor for next page |
| List songs (search) | Create songs, call `listSongs({ searchPrefix: "good" })` | Returns matching songs |

### 6.2.2 Session CRUD (`sessions.integration.test.ts`)

| Test | Steps | Expected |
|---|---|---|
| Create session | Call `createSession()` | Session document exists with `songCount: 0` |
| Add song to session | Call `addSongToSession()` | Subcollection doc exists, `songCount` incremented |
| Get session songs | Call `getSessionSongs()` | Returns songs in correct order |
| Remove song | Call `removeSongFromSession()` | Subcollection doc removed, `songCount` decremented |
| Reorder | Call `reorderSessionSongs()` | Songs in new order |

### 6.2.3 Song Edit Workflow (`songEdits.integration.test.ts`)

| Test | Steps | Expected |
|---|---|---|
| Create draft | Call `createDraft(songId)` | Draft doc exists with `status: "draft"` |
| Publish draft | Call `publishDraft(editId)` | Song updated, old version archived, draft deleted |
| Discard draft | Call `discardDraft(editId)` | Draft deleted, song unchanged |

### 6.2.4 Security Rules Smoke Tests (`rules.integration.test.ts`)

| Test | Steps | Expected |
|---|---|---|
| Anon read songs | Read `songs/x` without auth | Permission denied |
| Musician read songs | Read `songs/x` as musician | Success |
| Musician write songs | Write `songs/x` as musician | Permission denied |
| Admin write songs | Write `songs/x` as admin | Success |
| Musician read drafts | Read `songEdits/x` as musician | Permission denied |
| Admin read drafts | Read `songEdits/x` as admin | Success |
| Musician read sessions | Read `sessions/x` as musician | Success |
| Musician write sessions | Write `sessions/x` as musician | Permission denied |
| User read own profile | Read `users/uid` as that user | Success |
| User read other profile | Read `users/other_uid` | Permission denied |

---

## 6.3 E2E Tests (Web)

**Framework:** Playwright  
**Location:** `webmvp/e2e/`

### Key User Flows

| Test | Steps | Expected |
|---|---|---|
| **Browse → View → Transpose** | Login → Song list loads → Click "Good Good Father" → Song detail shows sections → Change key to G → Chords update | Chords display correctly in key G |
| **Search → View** | Login → Type "way" in search → "Way Maker" appears → Click → Song loads | Search returns correct results |
| **Import → Save → View** | Login as admin → Click "Add Song" → Paste lyrics → Place chords → Save → Redirected to song detail | New song appears in list |
| **Session Builder → View** | Login as admin → Sessions tab → New Session → Add 3 songs → Save → View session | Session shows 3 songs in order |
| **Add to Session from Song** | Login as admin → View song → "Add to Session" → Select session → Confirm | Song added to session |
| **Session Offline Cache** | Login → View session → "Cache Offline" → Go offline (via DevTools) → Reload → Session loads | Session and songs load from cache |
| **Auth Gate** | Open `/import` without login → Redirected to `/login` | Login page shown |
| **Role Gate** | Login as musician → "Add Song" button is hidden → Navigate to `/import` directly → Access denied | No write access for musician |

---

## 6.4 Performance Checks

| Test | Method | Target |
|---|---|---|
| **List 100 songs** | Seed 100 songs → measure `listSongs()` time | < 300ms |
| **List 1,000 songs (first page)** | Seed 1,000 songs → measure first page load | < 500ms |
| **Paginate 1,000 songs** | Load 50 pages of 20 → verify no duplicates/missing | All 1,000 songs seen exactly once |
| **Song detail load** | Measure `getSong()` for a song with 8 sections | < 200ms |
| **Session load (5 songs)** | Load session + fetch all 5 referenced songs | < 400ms total |
| **Bundle size** | Run `next build`, check JS bundle size | Firebase SDK < 100KB gzipped |

---

## 6.5 Offline Tests

| Test | Method | Expected |
|---|---|---|
| **Cached song access** | View song → DevTools → Offline → Reload page | Song renders from cache |
| **Cached session access** | Cache session → Offline → Navigate to session | Session list and songs render |
| **Offline indicator** | Go offline → Check for banner | "Offline" banner visible |
| **Reconnect sync** | Go offline → Go online → Check data freshness | Data refreshes, banner hides |
| **Write queue** | (Admin) Go offline → Add song → Go online | Song syncs to Firestore on reconnect |
| **Stale cache** | Cache song → Admin edits song online → Musician reconnects | Musician sees updated song after reconnect |

---

## 6.6 Test File Structure

```
webmvp/
├── src/
│   └── __tests__/
│       ├── engine.test.ts
│       ├── editorParser.test.ts
│       ├── validation.test.ts
│       ├── utils.test.ts
│       └── integration/
│           ├── songs.integration.test.ts
│           ├── sessions.integration.test.ts
│           ├── songEdits.integration.test.ts
│           └── rules.integration.test.ts
├── e2e/
│   ├── browse-and-view.spec.ts
│   ├── search.spec.ts
│   ├── import-song.spec.ts
│   ├── session-builder.spec.ts
│   ├── offline.spec.ts
│   └── auth-gates.spec.ts
├── vitest.config.ts
└── playwright.config.ts
```
