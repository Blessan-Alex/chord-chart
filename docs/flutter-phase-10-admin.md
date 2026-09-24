# Flutter Phase 10 — Admin dashboard & song authoring

**Parent:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 10  
**Parity specs:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.10 admin dashboard, §3.11 import/edit, §4 admin collections, §7 rules (`token.admin`)  
**Roadmap alignment:** Expands product beyond musician-only v1; **requires product sign-off** and roadmap §0 update  
**Depends on:** [Phase 1](flutter-phase-1-auth.md) (ID token claims), [Phase 2](flutter-phase-2-library.md) (song index search), [Phase 3](flutter-phase-3-song-chart.md) + [3.5](flutter-phase-3.5-chart-ux.md) (chart layout engine), [Phase 9](flutter-phase-9-production.md) (production auth/App Check recommended)  
**Backend:** Firestore admin writes (`songs`, **`songEdits`**, index upsert on publish/create — same as web)

**Goal:** **Admin users on mobile/tablet** can manage the shared library like web: dashboard stats, search/archive songs, **import** new songs, **edit** existing songs via the **`songEdits` draft workflow**, and **place chords** with a touch-first editor matching web placement semantics.

**Estimate:** **8–12 person-weeks** (1 FTE) — split into sub-phases below; placement editor is the largest risk.

**Product label:** **v2.0** or **admin add-on** track (not required for musician v1.1).

---

## 1. Scope summary

### In scope (Phase 10)

| Sub-phase | Area | Web reference | Flutter deliverable |
|-----------|------|---------------|---------------------|
| **10A** | Admin gate & routes | `useAuth.isAdmin`, redirect | Read `getIdTokenResult().claims.admin == true`; routes `/admin`, `/import`, `/song/:id/edit`; non-admin never sees entry points |
| **10B** | Dashboard | `admin/page.tsx`, `AdminStatsCards`, `AdminSongRow` | Stats: song / playlist / group counts; searchable index list; navigate to edit |
| **10C** | Archive / delete | `archiveSong`, confirm dialog | Archive with confirm; index listener refresh |
| **10D** | **Edit song (draft-first)** | `song/[id]/edit/page.tsx`, **`songEdits.ts`** | Load song + `getDraftForSong`; **`createDraft`** if none; **`reconcileDraftWithSong`**; composer bound to draft; **Save draft** → **`updateDraft`**; **Publish** → **`publishDraft`**; **Discard** → **`discardDraft`**; handle **`DraftVersionConflictError`** |
| **10E** | Import — source step | `/import`, `AdminSongComposer` step 1, `ChordProSourcePanel` | Paste ChordPro; parse via ported `chordProParser`; metadata fields |
| **10F** | Import / edit — placement step | `InteractiveEditor`, `LyricLineEditor`, `useTouchEditor` | Shared composer step 2: section/line editor; tap/long-press selection; add/move/delete chord marks |
| **10G** | Chord layout in editor | `useLyricChordOffsets`, `layoutKey` | **Reuse** `measureChordOffsets`, `wrapLyricLine`, `resolveChordLayout` — no second layout engine |
| **10H** | Composer flush (shared) | `AdminSongComposer` ref, `getSectionsForSave`, `chordSourceSync` | Before any save/publish: if ChordPro source dirty, **`tryFlushChordSource`** → sections |
| **10I** | **Import publish** | `import/page.tsx` → **`createSong`** | After flush: **`createSong`** (`songs.ts`) with title/artist/key/tags/sections; **`upsertSongIndexEntry`** inside web helper; then **`invalidateSongIndexCache`**; navigate to `/song/:id` |
| **10J** | **Edit publish transaction** | **`publishDraft`** in `songEdits.ts` | Transaction: archive prior song snapshot to `songEdits`, update live `songs/{id}` with **`serializeSectionsForPublish`**, version/`baseVersion` check, delete draft; trim archived versions (**`MAX_ARCHIVED_VERSIONS`**); **`upsertSongIndexEntry`**; **`invalidateSongIndexCache`**; navigate to song chart |

**Web evidence (edit is not direct `songs` patch for sections):** `edit/page.tsx` calls `createDraft` / `updateDraft` / `publishDraft` / `discardDraft` / `reconcileDraftWithSong` — never `updateSong` for the main publish path.

### Out of scope (Phase 10)

| Item | Note |
|------|------|
| Ops scripts | `set-admin`, `rebuild-index`, `seed`, `export-songs` — CLI only |
| Granting admin claim | Firebase Admin SDK / ops |
| Guest localStorage songs | Never on mobile |
| Full sidebar admin nav parity | Mobile: admin tab or profile entry only |
| Bulk import ZIP | Web has no parity — defer |
| **`updateSong` for edit publish** | Web edit publish uses **`publishDraft`** only; optional tiny metadata patches via `updateSong` are not the edit-page primary path |

### Mobile vs web (intentional)

| Topic | Web | Flutter Phase 10 |
|-------|-----|------------------|
| Admin home | `/admin` default for admins | Optional: profile → Admin or dedicated tab |
| Composer layout | Two-step wizard | Same steps; stack on phone |
| Edit actions | Save draft / Publish / Discard (fixed bottom bar on mobile) | Same three actions; sticky bottom bar on phone (`edit/page.tsx` sm:hidden footer) |
| Clipboard import | Browser paste | OS paste + share intent (P2) |
| Measurement | DOM `ResizeObserver` | `TextPainter` (same as musician chart) |
| Draft storage | `songEdits/*` only | Same collection — **no** local-only draft store |

---

## 2. Web behavior checklist (must match)

Sources: `admin/page.tsx`, `AdminStats.tsx`, `AdminSongRow.tsx`, `adminStats.ts`, `songs.ts` (`createSong`, `archiveSong`), **`songEdits.ts`**, `import/page.tsx`, `song/[id]/edit/page.tsx`, `AdminSongComposer.tsx`, `LyricLineEditor.tsx`, `useTouchEditor.ts`, `songIndexCache.ts`, `firestore.rules`.

### 2.1 Authorization

1. **Only** custom claim `admin == true` gates admin UI and writes — **never** `users.role` or profile field.
2. Non-admin navigating to `/admin` or `/import` or edit → redirect or “Admin only” (web import/edit pages).
3. Firestore rejects non-admin writes to `songs`, `songEdits`, index chunks.

### 2.2 Dashboard

1. `getAdminStats()` — aggregate counts (songs from index subscription, playlists, groups).
2. `subscribeSongIndexUpdates` — full index entries for search list.
3. Client search via same rank/filter as home (`useSongSearch` logic ported).
4. Row actions: open edit, archive with confirm.

### 2.3 Archive song

1. Sets song `status` archived (web `archiveSong`) — disappears from public index.
2. Refresh stats and index cache.

### 2.4 Composer — source step

1. Fields: title, artist, original key, language tags, optional notes.
2. ChordPro paste panel; parse to `Section[]`.
3. “Continue to placement” when sections non-empty or valid source.

### 2.5 Composer — placement step

1. Per line: lyric text + chord marks at grapheme indices (`ChordMark` / `createChordMark`).
2. Selection: word collapse, caret grapheme range (port `useTextSelection` helpers).
3. Touch: long-press to select; chord chip tap to edit/delete.
4. Packed chord-only lines (`isChordOnlyLine`) layout separately.
5. Preview uses same chord row layout as musician chart.

### 2.6 Import — create new song (**no `songEdits` draft**)

1. Admin on `/import`; `AdminSongComposer` for source + placement.
2. On create: `composerRef.getSectionsForSave()` (flush ChordPro if needed).
3. **`createSong(input, user.uid)`** — new doc in `songs/{id}`, `status: active`, `version: 1`, **`upsertSongIndexEntry`** (`songs.ts` ~L100–144).
4. **`invalidateSongIndexCache()`** then navigate to **`/song/{id}`** (`import/page.tsx` ~L58–78).

### 2.7 Edit existing song — **`songEdits` draft lifecycle** (mandatory)

1. Load **`getSong(songId)`** + **`getDraftForSong(songId)`**; if no draft and user present → **`createDraft(songId, uid)`** (`edit/page.tsx` ~L86–94, `songEdits.ts` ~L155–201).
2. Hydrate composer from draft; **`reconcileDraftWithSong`** when live `song.version` advanced (`songEdits.ts` ~L132–153).
3. **Save draft:** `getSectionsForSave()` → **`updateDraft(editId, { title, originalKey, sections, notes })`** (`edit/page.tsx` saveDraft handler).
4. **Publish:** reconcile again → **`publishDraft(editId, uid, { artist, tags })`** — transaction archives old song body, writes live song, deletes draft, index upsert, archived cap (`songEdits.ts` ~L250–351).
5. **Discard:** confirm dialog → **`discardDraft(editId)`** → back to song chart.
6. **`DraftVersionConflictError`** on publish if `song.version !== edit.baseVersion` — show reload message (`edit/page.tsx:231-234`).
7. **Artist / tags** on publish via `publishDraft` extras (not stored on draft doc the same way as title/sections — match web publish call).
8. **Save draft (metadata on live song):** after **`updateDraft`**, call **`updateSong(songId, { artist, tags })`** only (no sections) — best-effort; warn if fails (`edit/page.tsx:167-178`). Hydrate **artist/tags from `getSong`**, not draft (`112-113`).

### 2.8 Shared before save

1. **`getSectionsForSave()`** / **`tryFlushChordSource`** — keep visual chart sections or parse dirty ChordPro source (`AdminSongComposer` handle).

---

## 3. Suggested implementation order

| Order | Epic | Duration (rough) |
|-------|------|-------------------|
| 1 | **10A** Admin claim + routing shell | 3–5 days |
| 2 | **10B–10C** Dashboard + archive | 4–6 days |
| 3 | **10H** Port `getSectionsForSave` / chord source sync (needed by both flows) | 3–4 days |
| 4 | **10D + 10J** Draft load/save/publish/discard + `SongEditsRepository` | 6–8 days |
| 5 | **10E + 10I** Import UI + **`createSong`** path | 5–7 days |
| 6 | **10F–10G** Interactive placement editor | **15–25 days** |
| 7 | Parity QA: import create + edit publish + web cross-check | 5–7 days |

---

## 4. Flutter module map (planned)

| Layer | Packages / paths |
|-------|------------------|
| Domain | Port `chordProParser`, `chordSourceSync`, `chordMarks`, `serializeSectionsForPublish`, editor selection helpers into `lib/domain/` |
| Data | `AdminStatsRepository`, **`SongEditsRepository`** (`createDraft`, `updateDraft`, `publishDraft`, …), **`SongsAdminRepository.createSong`**, `archiveSong` |
| Features | `features/admin/`, `features/import/`, `features/song_edit/` (draft banner, save/publish/discard) |
| Routing | `RoutePaths.admin`, `import`, `songEdit(id)` guarded by admin provider |
| Reuse | `ChordLineWidget` / measurement from `features/song/` in editor preview; shared layout only |

---

## 5. Web ↔ Phase 10 coverage matrix

| Web capability | Web code | Phase 10 | Status |
|----------------|----------|----------|--------|
| Admin gate | `useAuth.isAdmin`, admin pages | 10A | Covered |
| Dashboard + archive | `admin/page.tsx`, `archiveSong` | 10B–10C | Covered |
| Import create | `createSong` in `import/page.tsx` | 10E–10I | Covered |
| Edit draft open | `createDraft`, `getDraftForSong` | 10D | Covered |
| Save draft | `updateDraft` + **`updateSong(artist,tags)`** | 10D | Covered |
| Publish edit | `publishDraft` + index upsert | 10J | Covered |
| Discard draft | `discardDraft` + confirm | 10D | Covered |
| Version conflict | `DraftVersionConflictError` | 10D / 10J | Covered |
| Composer flush | `getSectionsForSave` | 10H | Covered |
| Placement UI | `LyricLineEditor`, `useTouchEditor` | 10F–10G | Covered |
| Index cache invalidate | `invalidateSongIndexCache` | 10I–10J | Covered |
| Ops CLI | `scripts/rebuild-index` | Out of scope | Covered |

---

## 6. Acceptance criteria (DoD)

| # | Criterion |
|---|-----------|
| 1 | Non-admin APK never shows admin routes; admin claim shows dashboard. |
| 2 | Dashboard song count matches web for same project. |
| 3 | Archive song removes from musician home search on both platforms after index refresh. |
| 4 | **Import:** mobile **`createSong`** → song opens on web with **matching chord positions** (3 fixture songs). |
| 5 | **Edit:** mobile **publishDraft** → web song page shows updated title/sections; **no direct bypass** of draft for section writes. |
| 6 | Publish while another client bumped **`song.version`** shows conflict copy; reload recovers. |
| 7 | Placement editor usable on 360dp width phone (touch targets ≥ 44dp). |
| 8 | `flutter test` + `SongEditsRepository` / `createSong` unit tests; two-account manual (admin vs musician). |
| 9 | App Check + rules: admin writes succeed only with claim; musician writes still denied. |

---

## 7. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Duplicate layout logic | Mandate shared `measureChordOffsets` / `resolveChordLayout` |
| Editor scope explosion | Ship **10B–10C + 10D shell** (draft load/save without full placement) before **10F** |
| Wrong save path | Code review: import must call **`createSong`**; edit publish must call **`publishDraft`**, not generic `updateSong` |
| Index drift after save | **`invalidateSongIndexCache`** after create/publish (web parity) |
| iOS admin on iPad only? | Product decision — same Flutter codebase |
| Security | Never embed service account; all writes via user JWT + rules |

---

## 8. Manual QA script (abbreviated)

1. **Musician account:** no admin menu; direct `/admin` deep link → home.
2. **Admin account:** dashboard loads stats; search finds song; open edit → draft loads or is created.
3. **Edit draft:** change title → Save draft → kill app → reopen → draft persisted in Firestore.
4. **Edit publish:** Publish → musician chart + web show new content; draft doc gone.
5. **Edit conflict:** publish after simulating version bump (second client) → conflict message.
6. **Import:** paste ChordPro fixture → placement → create → open on web song page.
7. **Archive:** confirm dialog; song gone from home search.
8. **Regression:** musician chart pinch/zoom (Phase 3.5) unchanged on same build.

---

## 9. References

- Map: [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.10–3.11, §7
- Chart engine: [`flutter-phase-3-song-chart.md`](flutter-phase-3-song-chart.md), [`flutter-phase-3.5-chart-ux.md`](flutter-phase-3.5-chart-ux.md)
- Web: `webmvp/src/app/(app)/admin/page.tsx`, `webmvp/src/app/(app)/import/page.tsx`, `webmvp/src/app/(app)/song/[id]/edit/page.tsx`, `webmvp/src/lib/firestore/songEdits.ts`, `webmvp/src/lib/firestore/songs.ts` (`createSong`), `webmvp/src/components/AdminSongComposer.tsx`
