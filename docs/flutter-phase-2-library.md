# Flutter Phase 2 — Song index, home library, search & filters

**Parent:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 2  
**Parity specs:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.3, data §4.3, limits table §1 (browse 10/page vs search/filter **100** cap) · [`flutter-web-app-map-verification.md`](flutter-web-app-map-verification.md) when present (High errata override map)  
**Roadmap alignment:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 2 stories, feature matrix §3 (index, search, browse pagination, recent P1)  
**Depends on:** [Phase 1](flutter-phase-1-auth.md) complete (`go_router`, shell, `/home`, **guest** on home; signed-in without username still blocked by username gate)  
**Backend:** Firestore `songIndex/chunk0`…`chunk4` — **public read**; no client writes (admin/web only)

**Goal:** Replace the home placeholder with the **same library experience as web**: load the denormalized index (chunk0-first), search/rank/filter on-device, browse-all pagination, tap a song → **chart placeholder** (Phase 3). **Local-first:** index lives in memory (+ Firestore disk cache); zero extra reads per keystroke.

**Estimate:** 2 person-weeks (1 FTE)

---

## 1. Scope summary

### In scope (Phase 2)

| Area | Web reference | Flutter deliverable |
|------|---------------|---------------------|
| Index load (all chunks) | `loadSongIndex`, `loadSongIndexChunks` | `SongIndexRepository` |
| Progressive paint | `loadSongIndexCachedProgressive` | chunk0 first → merge rest → `sortLibraryEntries` |
| In-memory cache | `songIndexCache.ts` | Riverpod + repo singleton (peek, inflight dedupe, generation) |
| Live index refresh | `subscribeSongIndexUpdates` | **P1** (map Flutter note); web mounts listener on every `HomePage` — port in 2B/2C for parity when possible |
| Search + rank | `rankSongIndexResults`, `filterSongIndex` (alias) | Port `song_search_rank.dart`; expose `filterSongIndex` → same function |
| Search blob (read-only) | `buildSongSearchText` / `searchText` on entries | Port for tests; entries already carry `searchText` from server |
| Filters | `LibraryFilterSheet` | Bottom sheet: key, language tag, artist |
| Language tags | `languageTags.ts` | Port constants + `languageLabel` |
| Artists list | `libraryArtists.ts` | `collectLibraryArtists`, `artistMatchesFilter`, `isArtistFilterValid` |
| Browse vs search UX | `HomePage.tsx` `isBrowsingAll` | Same caps and pagination |
| Constants | `constants.ts` | `LIBRARY_BROWSE_CAP = 100`, `HOME_LIBRARY_PAGE_SIZE = 10` |
| Home UI | `HomePage`, `SongRow`, skeletons | `home_screen.dart`, `song_row.dart`, loading/error states |
| Search field | `SearchSuggestions` (top 6) | **P1:** dropdown suggestions; min: search + list |
| Guest browse | Map §1 guest | **No login** required for library (rules-aligned) |
| Song route stub | Tap row → `/song/:id` | Placeholder screen (“Chart in Phase 3”) |
| Recent songs | `recentSongs.ts` | **P1:** `shared_preferences` key `lf-recent-songs`, max 10; show section when no search/filters |
| Minimal `Key` type | `engine.ts` `ALL_KEYS` | Port **keys only** for filter grid (full `engine.dart` in Phase 3) |

### Out of scope (Phase 2)

| Item | Phase |
|------|--------|
| Full song chart, transpose, live `songs/{id}` stream | 3 |
| `getSong` / offline song body | 3 + 6 |
| Home **playlist previews**, **group playlists**, `listPlaylistsForUser` | 5 (+ groups 7) |
| Guest `localStorage` songs (`storage.ts`, delete local) | Never |
| `writeSongIndexEntries`, admin index rebuild | Never (web/admin) |
| `songEdits`, draft banners | Never |
| Performance mode, playlists CRUD, join API | 4–5 |
| SQLite/Isar primary index store | Optional later if memory tight; v1 = in-memory like web |

### Mobile vs web (intentional)

| Topic | Web | Flutter Phase 2 |
|-------|-----|-------------------|
| Home path | `/` | `/home` (Phase 1) |
| Song link | `/song/[id]` | `/song/:id` (same param) |
| Filter UI | Modal sheet (bottom on mobile web) | `showModalBottomSheet` / `DraggableScrollableSheet` |
| Playlist sections on home | Loaded when signed in | **Deferred** — optional “Your playlists — coming soon” or hide until Phase 5 |
| Index listener | `onSnapshot(chunk0)` | Same semantics; use Firestore plugin snapshots |

---

## 2. Web behavior checklist (must match)

Source: `HomePage.tsx`, `songIndexCache.ts`, `songSearchRank.ts`, `constants.ts`.

### 2.1 Index loading

1. On home mount: if cache empty, set **loading**; call **`loadSongIndexCachedProgressive(onPartial)`**.
2. **`onPartial`**: update UI with partial list (chunk0 only, then full merged list). **Web rule:** only apply partial if `partial.length >= bestCount` (avoids flicker if a stale callback returns fewer entries).
3. Merge remaining chunks: `sortLibraryEntries([...chunk0, ...rest])` — chunks are disjoint by design; if ids ever overlap, dedupe by `id` before sort.
4. Use a **`cancelled`** flag on dispose/unmount so async load does not update state after leaving home.
5. Full load uses `getDoc` with **cache-first**, fallback `getDocFromServer` on failure (port `loadSongIndexChunks` read helper).
6. **Do not** query `songs` collection for library browse (map + rules).
7. Chunk IDs fixed: `chunk0`…`chunk4`; export `SONG_INDEX_CHUNK_IDS` / `SONG_INDEX_CHUNK_SIZE` / `SONG_INDEX_CAPACITY` for tests and docs.
8. On mount, also **`subscribeSongIndexUpdates`** (web `HomePage` second `useEffect`) — updates `indexEntries` when cache invalidates (P1 if timeboxed).

### 2.2 `isBrowsingAll` (critical — verification errata)

```text
isBrowsingAll = no search query trim AND no key AND no language AND no artist filter
```

| Mode | Sort/rank | Display slice | Cap |
|------|-----------|---------------|-----|
| **Browse all** (`isBrowsingAll`) | `sortLibraryEntries` (updatedAtMs desc, title tie-break) | Page `libraryPage`, size **`HOME_LIBRARY_PAGE_SIZE` (10)** | **No 100 cap** — paginate entire index |
| **Search or any filter** | `rankSongIndexResults` | First **`LIBRARY_BROWSE_CAP` (100)** | Show “Showing 100 of N” when `libraryResults.length > 100` |

When user types search or applies filters, reset **`libraryPage`** to `0` (web `useEffect` on `[searchQuery, keyFilter, languageFilter, artistFilter]`).

**Filter-only (no search text):** `isBrowsingAll` is **false** → results still use rank path with empty tokens (= `sortLibraryEntries` on filtered set) but display is **`slice(0, 100)`** — **no pagination controls** (only browse-all mode shows Prev/Next).

**Pagination (browse-all only):** `libraryPageCount = max(1, ceil(libraryResults.length / 10))`; disable Prev on page 0; Next clamped to `libraryPageCount - 1`.

**Cap banner (search/filter):** When `libraryCapped`, show list header:  
`Showing 100 of {n} songs — search or filter to narrow the list.` (exact web copy).

### 2.3 Search ranking (port exactly)

- Tokenize query: trim, lower, split whitespace.
- Empty tokens → filtered list sorted with `sortLibraryEntries` (not ranked).
- Non-empty: `scoreEntry` per token; **all tokens must match** (score -1 drops entry).
- Sort by score desc, then `title.localeCompare`.
- Filters applied **before** rank: key equality, tag **includes** `tagFilter`, artist exact match case-insensitive (`artistMatchesFilter`).

### 2.4 Filters

| Filter | Source | Behavior |
|--------|--------|----------|
| Key | `ALL_KEYS` from engine | Single select or “All” |
| Language | `LANGUAGE_TAGS` | Tag value e.g. `lang:english`; filter `entry.tags.includes(tag)` |
| Artist | `collectLibraryArtists(index)` | Dropdown/list; invalidate stale artist if not in list |

`libraryFilterLabel` — port for filter button label (`Filter` or `Key · Language · Artist`).

### 2.5 Recent songs (P1 — roadmap matrix)

- Storage key **`lf-recent-songs`**, max **10** entries.
- Show section only when: has visible recent (song id still in index), **and** `isBrowsingAll`.
- `filterRecentByKnownIds` — drop recent entries whose id left the index.
- **Recording** recent on view → Phase 3 when opening song; Phase 2 may wire stub route only or record on placeholder open (prefer record on placeholder tap for UX testing).

### 2.6 Index cache module behavior

Port `songIndexCache.ts` semantics:

| API | Behavior |
|-----|----------|
| `peekSongIndexCache()` | Full or partial entries for instant paint |
| `peekFullSongIndexCache()` | Full only |
| `loadSongIndexCached` | Dedupe inflight; respect `preferServer` |
| `loadSongIndexCachedProgressive` | Dedupe inflight progressive |
| `clearSongIndexCache` / generation | Invalidate on forced refresh |
| `subscribeSongIndexUpdates` | Ref-count listeners; one `chunk0` snapshot; debounce **400ms**; `invalidateSongIndexCache` |

### 2.7 Errors & empty states

- Index load failure → error message + retry (port `PageError` / `formatError` pattern).
- Empty search → “No songs match…” when filtered list empty.
- Loading → skeleton rows (`SongRowSkeleton` count = page size on browse).

### 2.8 Guest access

- No auth required to load `songIndex` or show home library (Firestore public read; map §1 guest).
- **Guest banner** (web): “Guest · Sign in for playlists & groups” with link to `/login` — port on home when `user == null`.
- Signed-in users see the same library UI; **playlist / group sections** on web (`listOwnedPlaylists`, `listGroupsForMember`, …) are **deferred** to Phase 5 (no `socialError` / preview cards in Phase 2 unless stubbed).
- **“On this device” local songs** (`showLocalSongs` + `storage.ts`): **never** on Flutter — skip section entirely.

### 2.9 Home screen composition (section order)

Match `HomePage.tsx` structure where applicable:

1. Song count line: `Loading…` or `{indexEntries.length} songs`.
2. Guest sign-in hint (if not authenticated).
3. Search row + filter button (`hasActiveFilters` styling when any filter set).
4. `LibraryFilterSheet` (modal).
5. `PageError` for **library** load failure only (not playlist errors in Phase 2).
6. **Recently viewed** (P1) — when `showRecent`.
7. **All songs** section header + list / skeletons / empty message:
   - Empty index: “No songs in the library yet.”
   - No matches: “No songs match your search.”
8. Pagination bar (browse-all only, when `libraryResults.length > 10`).

Search placeholder: `Search songs, artists, lyrics…`

### 2.10 Firestore entry parsing

- Map missing `artist` to `""`; `tags` to `[]`.
- `key` must parse as `Key` (one of `ALL_KEYS`); invalid keys in index are admin data bugs — skip or log in debug.
- `updatedAtMs` optional on doc; default `0` for sort (same as `resolveUpdatedAtMs` fallback on server build).

---

## 3. Data model

### `SongIndexEntry` (port from `types.ts`)

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Song doc id |
| `title` | string | |
| `artist` | string | Often `""` |
| `key` | Key | `originalKey` in index |
| `tags` | string[] | Includes `lang:*` |
| `searchText` | string? | Precomputed server-side |
| `updatedAtMs` | number? | Sort for browse-all |

### Firestore `songIndex/{chunkId}`

```dart
// Document: { entries: List<SongIndexEntry>, updatedAt: Timestamp }
```

**Rules:** public read; mobile **never** writes.

### Limits (map §1 — do not exceed in client assumptions)

| Constant | Value |
|----------|--------|
| `SONG_INDEX_CHUNK_IDS` | 5 chunks |
| `SONG_INDEX_CHUNK_SIZE` | 2000 |
| `SONG_INDEX_CAPACITY` | 10000 |
| `SONG_INDEX_SEARCH_TEXT_MAX` | 512 (server build) |
| `LIBRARY_BROWSE_CAP` | 100 |
| `HOME_LIBRARY_PAGE_SIZE` | 10 |

---

## 4. Local-first & performance

| Principle | Implementation |
|-----------|----------------|
| **No reads per keystroke** | Search runs on `List<SongIndexEntry>` in memory |
| **Firestore persistence** | Chunk docs cached on disk after first fetch (Phase 1 `cloud_firestore`) |
| **Progressive UX** | Show chunk0 ASAP; avoid blocking home on full 10k merge |
| **Memory** | ~10k entries × ~small maps — acceptable v1; monitor on low-RAM devices |
| **Future** | `compute` isolate for rank if jank; not required if web JS is fine |

Invalidate cache when `chunk0` snapshot fires (admin published new song).

---

## 5. Dependencies

Phase 2 adds no new Firebase products beyond Phase 1 `cloud_firestore`.

Optional:

```yaml
# Already in roadmap appendix for later phases; Phase 2 only if needed:
# collection: ^1.18.0   # deep equality in tests
```

**Domain ports (minimal keys):** add `domain/keys.dart` or `domain/engine_keys.dart` with `ALL_KEYS` + `Key` typedef — full engine in Phase 3.

---

## 6. Architecture (Flutter)

### 6.1 Folder layout

```
mobile/lib/
  domain/
    constants.dart              # LIBRARY_BROWSE_CAP, HOME_LIBRARY_PAGE_SIZE
    song_search_rank.dart
    song_search_text.dart       # tests + parity; runtime uses entry.searchText
    library_artists.dart
    language_tags.dart
    keys.dart                   # ALL_KEYS only (Phase 2)
  data/
    models/song_index_entry.dart
    repositories/
      song_index_repository.dart
  features/
    library/
      home_screen.dart
      widgets/
        song_row.dart
        song_row_skeleton.dart
        library_filter_sheet.dart
        library_pagination_bar.dart
        recent_songs_section.dart   # P1
    song/
      song_placeholder_screen.dart  # Phase 2 stub → Phase 3 chart
  providers/
    song_index_providers.dart
```

### 6.2 Riverpod providers (sketch)

| Provider | Responsibility |
|----------|----------------|
| `songIndexRepositoryProvider` | Firestore access + cache |
| `songIndexEntriesProvider` | `AsyncValue<List<SongIndexEntry>>`; seed from `peekSongIndexCache()` on build |
| `songIndexProgressiveProvider` | Notifier: partial → full (`bestCount` guard) |
| `librarySearchQueryProvider` | `String` |
| `libraryFiltersProvider` | key / language / artist |
| `libraryPageProvider` | `int` browse page |
| `libraryResultsProvider` | Derived: rank/filter list |
| `displayedLibraryResultsProvider` | Derived: slice + cap logic §2.2 |
| `recentSongsProvider` | P1: prefs-backed list |

### 6.3 Routing (extend Phase 1)

| Route | Auth | Phase 2 change |
|-------|------|----------------|
| `/home` | Guest OK | Real `HomeScreen` |
| `/song/:id` | Guest OK (active songs, Phase 3 body) | **Add** — placeholder in Phase 2 |

**Routing recommendation:** Push `/song/:id` as a **full-screen** route **above** the shell (hide bottom nav) — matches focusing on one song; Phase 3 performance mode extends same route.

**Auth:** Guest allowed (map: active `songs` read in Phase 3; stub does not fetch song body yet).

**Query params (Phase 3+):** reserve `playlist`, `index`, `key` — no implementation in Phase 2.

**Back:** Android system back pops to `/home`.

### 6.4 UI parity notes

- Search bar with filter button; active filter indicator.
- `SongRow`: title, artist, key badge, language from tags.
- Pagination: prev/next or page indicator when `isBrowsingAll && total > 10`.
- Cap banner when `libraryCapped` (search/filter mode).

---

## 7. Sub-phases (implementation order)

### Phase 2A — Domain ports & tests (2–3 days)

- [ ] `song_index_entry.dart` model + Firestore parsing (`Timestamp` → `updatedAtMs` if needed on client).
- [ ] Port `constants.dart`, `song_search_rank.dart`, `song_search_text.dart`, `library_artists.dart`, `language_tags.dart`, `keys.dart`.
- [ ] Unit tests copied from web: `songSearchRank.test.ts`, `songSearchText.test.ts`, `libraryArtists.test.ts`, relevant `songIndex.test.ts` cases (merge/sort client-side).

### Phase 2B — Song index repository (2–3 days)

- [ ] `loadSongIndexChunks`, `loadSongIndex` with cache-first read.
- [ ] In-memory cache: progressive load, inflight dedupe, generation counter (port cache module).
- [ ] `peek*` helpers for router/home instant paint.
- [ ] **P1:** `subscribeSongIndexUpdates` with debounced refresh.

### Phase 2C — Providers & home logic (2 days)

- [ ] Wire `libraryResults` / `displayedResults` / `isBrowsingAll` / `libraryCapped` / page reset on filter change.
- [ ] Loading, error, empty states; progressive `bestCount` guard.
- [ ] **P1:** `subscribeSongIndexUpdates` wired on home mount.

### Phase 2D — Home UI (2–3 days)

- [ ] `HomeScreen` replaces placeholder on `/home` (§2.9 layout, guest banner, song count).
- [ ] `SongRow`, skeletons, filter sheet, pagination, cap message (no `onDelete` on index rows).
- [ ] **P1:** `SearchSuggestions` (max 6) + keyboard navigation optional.
- [ ] **P1:** Recent songs section.

### Phase 2E — Song placeholder route (1 day)

- [ ] `/song/:id` → placeholder UI + back nav.
- [ ] **P1:** `recordRecentSong` on open (prefs).

### Phase 2F — Integration & manual QA (1–2 days)

- [ ] Guest: open app → index loads → browse pages.
- [ ] Search: rank order smoke vs web for fixed fixture list.
- [ ] Filters: key + language + artist combinations.
- [ ] Airplane mode after first load: index from Firestore cache still lists (read-only).

### Phase 2G — Docs & roadmap (0.5 day)

- [ ] `mobile/README.md` note on index size / offline.
- [ ] Tick Phase 2 in `flutter-roadmap.md` when §9 done.

---

## 8. Testing plan

| Layer | What |
|-------|------|
| Unit | `rankSongIndexResults`, `sortLibraryEntries`, `compareLibraryEntries`, `entryMatchesQuery`, `buildSongSearchText`, `collectLibraryArtists`, `artistMatchesFilter` |
| Unit | Browse slice: 25 entries browse-all page 0 → 10 items; page 2 → next 10 |
| Unit | Filter-only (no query) with 150 matches → 100 displayed, `isBrowsingAll == false` |
| Unit | `partial.length < bestCount` does not regress UI (notifier test) |
| Widget | Home with fake `songIndexEntriesProvider` — loading / list / cap banner |
| Manual | Same church library: spot-check search “grace”, key filter, Malayalam tag |
| Manual | Paginate browse beyond 100 songs without search (confirms no erroneous cap) |

**Web e2e:** no dedicated library e2e; rely on unit parity with TS tests.

---

## 9. Definition of done (Phase 2)

- [ ] Progressive index load (chunk0 visible before full merge).
- [ ] Browse-all: sort by `updatedAtMs`, **10 per page**, **no 100 cap** on full index.
- [ ] Search or any filter: rank + **max 100** results with overflow message (filter-only counts too).
- [ ] Browse-all: pagination controls only when not searching/filtering.
- [ ] Guest banner + library error retry; empty copy matches web §2.9.
- [ ] Filters: key, language tag, artist — same rules as web.
- [ ] Guest can use library without signing in.
- [ ] Tap song → `/song/:id` placeholder.
- [ ] **P1:** Recent songs section + persistence key `lf-recent-songs`.
- [ ] **P1:** `subscribeSongIndexUpdates` refreshes list after admin index change (with debounce).
- [ ] No `songs` collection query for browse.
- [ ] `flutter test` includes rank/constants tests; `flutter analyze` clean.
- [ ] Roadmap Phase 2 progress updated.

---

## 10. Roadmap & feature matrix traceability

| Roadmap / matrix item | Section |
|------------------------|---------|
| Index load + progressive chunk0 (P0) | §2.1, 2B |
| Search + rank + filters (P0) | §2.3–2.4 |
| Browse-all pagination 10, no 100 cap (verification) | §2.2 |
| Search results cap 100 (verification) | §2.2 |
| Guest library browse (default allow) | §2.8 |
| Recent songs (P1) | §2.5 |
| Live index listeners (map P1) | §2.6, 2B |
| Tap row → song placeholder | §2E, §6.3 |

---

## 11. Web file → Flutter port map

| Web file | Flutter target |
|----------|----------------|
| `lib/firestore/songIndex.ts` | `song_index_repository.dart` (+ read helpers) |
| `lib/firestore/songIndexCache.ts` | same repo / `song_index_cache.dart` |
| `lib/songSearchRank.ts` | `song_search_rank.dart` |
| `lib/songSearchText.ts` | `song_search_text.dart` |
| `lib/constants.ts` | `constants.dart` |
| `lib/libraryArtists.ts` | `library_artists.dart` |
| `lib/languageTags.ts` | `language_tags.dart` |
| `lib/recentSongs.ts` | `recent_songs_repository.dart` or service |
| `lib/hooks/useSongSearch.ts` | `libraryResultsProvider` |
| `components/HomePage.tsx` | `home_screen.dart` |
| `components/SongRow.tsx` | `song_row.dart` |
| `components/LibraryFilterSheet.tsx` | `library_filter_sheet.dart` |
| `components/SearchSuggestions.tsx` | P1 widget |
| `components/PageError.tsx` | reuse / small error widget |
| `components/SongRowSkeleton.tsx` | `song_row_skeleton.dart` |
| `components/SectionHeader.tsx` | inline or `section_header.dart` |
| `lib/formatError.ts` | `core/utils/format_error.dart` or inline |
| `lib/engine.ts` (`ALL_KEYS` only) | `keys.dart` |
| `lib/storage.ts` | **Not ported** |
| `lib/firestore/songIndex.ts` (`mergeIndexEntry`, `writeSongIndex*`) | **Not ported** (admin write) |

### Domain ports checklist (roadmap Phase 2)

| Web module | Phase 2 |
|------------|---------|
| `firestore/songIndex.ts` (read + `filterSongIndex`) | **Yes** |
| `songIndexCache.ts` | **Yes** |
| `songSearchRank.ts` | **Yes** |
| `songSearchText.ts` | **Yes** (tests + parity) |
| `constants.ts` (library caps) | **Yes** |
| `libraryArtists.ts` | **Yes** |
| `languageTags.ts` | **Yes** |
| `recentSongs.ts` | **P1** |

---

## 12. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| 10k entries RAM | Single list; profile memory; isolate later |
| Stale index on device | P1 chunk0 listener + manual pull-to-refresh optional |
| Wrong browse cap | Unit test §8; code review `isBrowsingAll` branch |
| Phase 1 router blocks guest home | Verify guest `/home` from Phase 1 §2.9 |
| Large first fetch on slow network | Progressive load + skeletons |
| Artist filter stale after index refresh | `isArtistFilterValid` clear (web `useEffect`) |
| Filter-only confused with browse pagination | Unit test §8; UI hides pager when `!isBrowsingAll` |
| Phase 1 username gate | Signed-in without @username never reaches home until onboarding |

---

## 12b. Audit notes (map / web cross-check)

| Check | Status in this doc |
|-------|-------------------|
| Map §1 limits (10/page browse, 100 search/filter) | §2.2, §3 |
| Map §3.3 behaviors (progressive, rank, filters, no `songs` query) | §2.1–2.4 |
| Map §3.3 recent + playlist sections | Recent P1; playlists Phase 5 |
| Guest `localStorage` library | Explicitly excluded §2.8 |
| `filterSongIndex` === `rankSongIndexResults` | §1 in scope |
| Web `HomePage` subscribe + progressive | §2.1, §2.6 |
| Roadmap Phase 2 five user stories | §10 |
| Song chart / transpose | Phase 3 §13 |

---

## 13. What comes next (not Phase 2 gaps)

| Web map | Phase |
|---------|--------|
| §3.4 Song chart + transpose | 3 |
| §3.5 Performance | 4 |
| §3.6 Playlists + home previews | 5 |
| §3.7 Groups | 7 |
| §3.12 Offline banner | 6 |
| `recordRecentSong` on real chart view | 3 (can start in 2E stub) |

---

## 14. After Phase 2

- **Phase 3:** [`flutter-phase-3-song-chart.md`](flutter-phase-3-song-chart.md) — replace placeholder, `SongRepository.watchSong(id)`, full engine/layout ports.
- **Phase 5:** Home sections for `listPlaylistsForUser` / group playlists (`HomePage` social blocks).

---

*End of Phase 2 plan.*
