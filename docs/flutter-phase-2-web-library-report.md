# Web MVP home library parity report (Phase A)

**Purpose:** Ground-truth behavior of `webmvp/` home/library for Flutter Phase 2.  
**Generated:** Phase A code read (no Flutter library implementation in this pass).  
**Cross-check:** [`flutter-phase-2-library.md`](flutter-phase-2-library.md) §2, [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.3 and limits table §1.

---

## 1. Data model

### `SongIndexEntry` (UI + search)

Source: `webmvp/src/lib/types.ts:40-50`.

| Field | Type | UI / search use |
|-------|------|-----------------|
| `id` | `string` | Row link `/song/${id}` (`HomePage.tsx:652`) |
| `title` | `string` | Row title; ranking (`songSearchRank.ts:10-26`) |
| `artist` | `string` | Row subtitle; artist filter; ranking (`songSearchRank.ts:28-29`) |
| `key` | `Key` | Row key badge; key filter equality (`songSearchRank.ts:95-97`) |
| `tags` | `string[]` | Row tags; language filter via `tags.includes(tagFilter)` (`songSearchRank.ts:99-101`) |
| `searchText` | `string?` | Lyric/metadata blob for token match (`songSearchRank.ts:34-35`) |
| `updatedAtMs` | `number?` | Browse-all sort primary key (`songSearchRank.ts:137-141`) |

Admin builds `searchText` via `buildSongSearchText` in `songToIndexEntry` (`songIndex.ts:111-116`).

### `songIndex/{chunkId}` document

Source: `webmvp/src/lib/types.ts:52-56`.

| Field | Value |
|-------|--------|
| `entries` | `SongIndexEntry[]` |
| `updatedAt` | Firestore `Timestamp` (metadata; not used for home sort — sort uses per-entry `updatedAtMs`) |

Chunk IDs: `chunk0` … `chunk4` (`songIndex.ts:20-26`). Each chunk holds up to **2000** entries by title order (`SONG_INDEX_CHUNK_SIZE`, `songIndex.ts:28`, `buildIndexChunks` `songIndex.ts:131-145`).

### Firestore rules

`firestore.rules:37-42`: **`songIndex/{chunkId}`** — `allow read: if true`; create/update/delete **admin only**. Musician client is read-only.

---

## 2. Index load lifecycle (home mount)

Source: `HomePage.tsx:104-109`, `230-279`; `songIndexCache.ts`; `songIndex.ts:164-191`.

| Step | Behavior | Citation |
|------|----------|----------|
| Initial state | `indexEntries` = `peekSongIndexCache() ?? []`; `indexLoading` = cache is null | `HomePage.tsx:104-109` |
| Mount effect 1 | If `peekSongIndexCache() === null` → `setIndexLoading(true)` | `HomePage.tsx:238-240` |
| Progressive load | `loadSongIndexCachedProgressive(onPartial)` | `HomePage.tsx:245-252` |
| **Anti-flicker** | In `onPartial`: skip if `cancelled` **or** `partial.length < bestCount`; else update `bestCount`, `setIndexEntries`, `setLoaded(true)`, `setIndexLoading(false)` | `HomePage.tsx:246-252` |
| Final merge | On promise resolve: `setIndexEntries(entries)`, `setLoaded(true)`, `setIndexLoading(false)` | `HomePage.tsx:254-257` |
| Error | `setIndexError(formatError(error))`, stop loading | `HomePage.tsx:259-263` |
| Unmount | `cancelled = true` in cleanup | `HomePage.tsx:268-270` |
| Listener | `subscribeSongIndexUpdates` → replace entries, clear loading | `HomePage.tsx:273-278`, `songIndexCache.ts:153-193` |

### Progressive cache module (`loadSongIndexCachedProgressive`)

`songIndexCache.ts:82-125`:

1. If `cachedEntries` and not `preferServer` → call `onPartial(cachedEntries)`, return full cache.
2. Dedupe via `inflightProgressive`.
3. Load `chunk0` → set `partialEntries`, `onPartial(chunk0)`.
4. Load `chunk1`…`chunk4` → `sortLibraryEntries([...chunk0, ...rest])` → `cachedEntries`, clear `partialEntries`, `onPartial(merged)`.
5. Stale loads aborted via `cacheGeneration` (`isCurrentGeneration`).

### Chunk read (cache-first)

`loadSongIndexChunks` (`songIndex.ts:164-191`): unless `preferServer`, use `getDoc(ref)`; on failure → `getDocFromServer(ref)`.

**Never** loads `songs/*` for library list (`songIndex.ts:148-157` aliases rank; home uses index only).

---

## 3. `isBrowsingAll` truth table

Definition (`HomePage.tsx:190-191`):

```text
isBrowsingAll =
  !searchQuery.trim() && !keyFilter && !languageFilter && !artistFilter
```

Empty string filters count as “no filter” (`keyFilter` is `Key | ""`, others `string`).

| Mode | `libraryResults` source | `displayedResults` | Pagination UI | Cap banner |
|------|-------------------------|--------------------|---------------|------------|
| **Browse all** (`isBrowsingAll === true`) | `useSongSearch` → `filterSongIndex` → empty query → **`sortLibraryEntries`** (updatedAtMs ↓, title tie-break) | `libraryResults.slice(page*10, (page+1)*10)` | **Yes** if `libraryResults.length > 10` | **No** |
| **Search and/or any filter** (`isBrowsingAll === false`) | Same hook → filters applied → empty or non-empty query → **`rankSongIndexResults`** (empty tokens = sort filtered set) | **`libraryResults.slice(0, LIBRARY_BROWSE_CAP)`** | **No** | **Yes** if `libraryResults.length > 100` |

Slice logic (`HomePage.tsx:196-203`):

```typescript
displayedResults = isBrowsingAll
  ? libraryResults.slice(libraryPage * HOME_LIBRARY_PAGE_SIZE, (libraryPage + 1) * HOME_LIBRARY_PAGE_SIZE)
  : libraryResults.slice(0, LIBRARY_BROWSE_CAP);

libraryCapped = !isBrowsingAll && libraryResults.length > LIBRARY_BROWSE_CAP;
```

Pagination (`HomePage.tsx:192-195`, `655-682`): only when `isBrowsingAll && libraryResults.length > HOME_LIBRARY_PAGE_SIZE`.

Cap banner copy (`HomePage.tsx:638-642`, exact):

```text
Showing {LIBRARY_BROWSE_CAP} of {libraryResults.length} songs — search or filter to narrow the list.
```

(`LIBRARY_BROWSE_CAP` is **100**.)

**Page reset:** `setLibraryPage(0)` when `searchQuery`, `keyFilter`, `languageFilter`, or `artistFilter` change (`HomePage.tsx:230-232`).

---

## 4. Filter-only edge case (no search text)

When user sets key/language/artist but leaves search empty:

- `isBrowsingAll` is **false** (`HomePage.tsx:190-191`).
- `rankSongIndexResults` with empty tokens → **`sortLibraryEntries(filtered)`** (`songSearchRank.ts:121-123`).
- Display: **`slice(0, 100)`**, **no** Prev/Next (`HomePage.tsx:196-201`, `655`).
- `libraryCapped` true when filtered count **> 100** (`HomePage.tsx:202-203`).

**DOC WINS / WEB WINS:** Matches [`flutter-phase-2-library.md`](flutter-phase-2-library.md) §2.2 filter-only errata and [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.3 (search **or** filters → 100 cap).

Test anchor: **`rankSongIndexResults` → "applies artist filter before scoring"** with `query ""` (`songSearchRank.test.ts:74-82`).

---

## 5. Search ranking spec

Implementation: `songSearchRank.ts`; tests: `songSearchRank.test.ts`.

| Rule | Detail | Test name |
|------|--------|-----------|
| Tokenize | `trim`, lower, split on whitespace | (implicit in all rank tests) |
| All tokens required | Any token score 0 → entry dropped (`scoreEntry` returns -1) | **"excludes entries that miss a token"** |
| Multi-token AND | `"good father"` → only `good-good-father` | **"requires all tokens to match somewhere"** |
| Title vs lyric | `"maker"` → `way-maker` before lyric-only | **"ranks title matches above lyric-only matches"** |
| Lyric via `searchText` | `"miracle worker"` → `way-maker` | **"finds lyric phrases in searchText"** |
| Key filter | Before scoring | **"applies key filter before scoring"** |
| Language filter | `tags.includes(tagFilter)` | **"applies language filter before scoring"** |
| Artist filter | `artistMatchesFilter` exact CI match | **"applies artist filter before scoring"** |
| Empty query sort | `sortLibraryEntries` (updatedAtMs desc, title) | **"sorts by updatedAtMs descending when query is empty"** |
| Result order | Score desc, then `title.localeCompare` | `songSearchRank.ts:129` |

`filterSongIndex` in `songIndex.ts:148-157` is a **thin alias** to `rankSongIndexResults` (same args: query, key, tagFilter, artistFilter).

---

## 6. Cache module API

| Function | Behavior | Source |
|----------|----------|--------|
| `peekSongIndexCache()` | Returns `cachedEntries ?? partialEntries` (may be chunk0-only partial) | `songIndexCache.ts:35-37` |
| `peekFullSongIndexCache()` | Full merge only (`cachedEntries`) | `songIndexCache.ts:40-42` |
| `clearSongIndexCache()` | Clears caches, bumps generation, clears inflight | `songIndexCache.ts:44-50` |
| `loadSongIndexCached()` | Full index; inflight dedupe; optional `preferServer` | `songIndexCache.ts:52-79` |
| `loadSongIndexCachedProgressive(onPartial?)` | chunk0 → rest → sorted merge; inflight dedupe; generation guard | `songIndexCache.ts:82-125` |
| `invalidateSongIndexCache()` | `beginCacheRefresh` + server reload + notify listeners | `songIndexCache.ts:133-150` |
| `subscribeSongIndexUpdates(onUpdate)` | Register listener; seed from cache; first subscriber attaches `onSnapshot(songIndex/chunk0)` debounced 400ms → invalidate | `songIndexCache.ts:153-193` |
| `beginCacheRefresh()` | `cacheGeneration++`, clear inflight | `songIndexCache.ts:23-28` |
| `isCurrentGeneration(g)` | Stale load guard | `songIndexCache.ts:30-32` |

---

## 7. Recent songs

| Item | Web behavior | Citation |
|------|--------------|----------|
| Storage key | `lf-recent-songs` (`RECENT_SONGS_STORAGE_KEY`) | `recentSongs.ts:11-12` |
| Max entries | **10** (`MAX_RECENT`) | `recentSongs.ts:13`, test **"caps the list at 10 entries"** |
| Record | `recordRecentSong` prepends, dedupes by `songId` | `recentSongs.ts:45-65`; tests **"records a song at the front"**, **"moves an existing song to the front"** |
| Prune unknown ids | `filterRecentByKnownIds(entries, knownSongIds)` | `recentSongs.ts:69-74`; test **"filters out entries missing from the known library"** |
| Section visible | `showRecent`: `visibleRecent.length > 0` and same condition as **`isBrowsingAll`** (no search/filters) | `HomePage.tsx:215-220` |
| `knownSongIds` | Set of all `indexEntries[].id` | `HomePage.tsx:205-212` |

**Where recorded:** Firestore song page after load — `song/[id]/page.tsx:145-157` (`recordRecentSong` once per song id via ref).

Mobile Phase 2E: record on placeholder chart open (per phase doc).

---

## 8. Home UI structure (section order)

Within `HomePage.tsx` main column (`420-688`):

| Order | Section | Condition |
|-------|---------|-----------|
| 1 | Song count / “Loading…” | Always (`411-416`) |
| 2 | Guest banner | `!user` (`421-428`) |
| 3 | Search + filter button | Always (`431-478`) |
| 4 | `LibraryFilterSheet` | Modal when open (`480-495`) |
| 5 | Index / social errors | If set (`497-500`) |
| 6 | **Recently viewed** | `showRecent` (`502-517`) |
| 7 | **My playlists** + **Group playlists** | `user && isBrowsingAll` (`519-594`) |
| 8 | **On this device** (localStorage songs) | `showLocalSongs` = guest + local songs + isBrowsingAll (`392-393`, `596-618`) |
| 9 | **All songs** | `loaded \|\| indexLoading` (`620-687`) |

**Mobile Phase 2 defers:** playlist/group previews (`flutter-phase-2-library.md` §1 Out of scope / Mobile vs web). **Never on mobile:** guest localStorage block (`showLocalSongs`).

---

## 9. Guest vs auth

| Capability | Guest | Signed in |
|------------|-------|-----------|
| Load `songIndex` | **Yes** (rules public read) | Yes |
| Search / filter / browse pagination | **Yes** | Yes |
| Home index mount | No `user` check | Same code path |
| Playlist sections | Hidden | Shown when browsing all (`519`) |
| Username gate | N/A on web home `/` | Phase 1 Flutter: shell gate still applies on `/home` |

Playlists/groups on web require `user` (`281-375`); not Phase 2 Flutter scope.

---

## 10. Constants inventory

| Constant | Value | Source |
|----------|-------|--------|
| `LIBRARY_BROWSE_CAP` | 100 | `constants.ts:2` |
| `HOME_LIBRARY_PAGE_SIZE` | 10 | `constants.ts:5` |
| `PUBLISHED_PLAYLIST_CAP` | 100 | `constants.ts:8` (playlists page, not home list) |
| `SONG_INDEX_CHUNK_SIZE` | 2000 | `songIndex.ts:28` |
| `SONG_INDEX_CHUNK_IDS` | 5 chunks | `songIndex.ts:20-26` |
| `SONG_INDEX_CAPACITY` | 10000 | `songIndex.ts:35-36` |
| `SONG_INDEX_CHUNK_MAX_BYTES` | 921600 (900×1024) | `songIndex.ts:49` |
| `SONG_INDEX_SEARCH_TEXT_MAX` | 512 | `songSearchText.ts:4` |
| `MAX_RECENT` (recent songs) | 10 | `recentSongs.ts:13` |
| Search suggestions slice | 6 | `HomePage.tsx:149-151` |
| Index listener debounce | 400 ms | `songIndexCache.ts:179-181` |
| Owned/group playlist preview limits | 2 each, 4 total previews | `HomePage.tsx:313-339` |

---

## 11. Gaps / ambiguities

| Topic | Notes |
|-------|--------|
| `filterSongIndex` test name **"sorts alphabetically when query is empty"** | Sample entries lack `updatedAtMs`; sort tie-break is title A–Z (`songIndex.test.ts:118-124`). **Primary sort is `updatedAtMs` desc** when set (`songSearchRank.test.ts:85-96`). |
| Chunk overlap | Progressive merge concatenates chunks; admin `buildIndexChunks` keeps disjoint slices — **TBD** if client should dedupe by `id` on merge (phase doc §2.1 suggests dedupe if overlap). |
| `loaded` flag | Web shows “All songs” when `loaded \|\| indexLoading`; empty state copy differs for zero index vs no matches (`631-633`). |
| Social preview `indexEntries` | Effect deps `[user, indexLoading]` only — uses index at fetch time (`374-375` eslint comment). |

---

## 12. Doc vs web conflicts

| Topic | Verdict | Evidence |
|-------|---------|----------|
| Browse 10/page, no 100 cap | **WEB WINS** = **DOC WINS** | `HomePage.tsx:196-200`, `655` |
| Search/filter 100 cap + banner | **WEB WINS** = **DOC WINS** | `HomePage.tsx:201-203`, `638-642` |
| Filter-only uses cap, no pagination | **WEB WINS** = **DOC WINS** | `isBrowsingAll` false when any filter (`190-191`) |
| Browse sort `updatedAtMs` | **WEB WINS** = **DOC WINS** | `compareLibraryEntries` `songSearchRank.ts:133-141` |
| Map §1 limits table | **WEB WINS** | Matches `HomePage.tsx` |
| `flutter-web-app-map-verification.md` | **Deleted from repo** in Phase 1 commit — phase doc references it; use this report + `HomePage.tsx` as truth |

---

## 13. Intentional mobile differences (pre-approved)

From `flutter-phase-2-library.md` § “Mobile vs web”:

| Topic | Web | Flutter Phase 2 |
|-------|-----|-----------------|
| Home route | `/` | `/home` |
| Song route | `/song/[id]` | `/song/:id` |
| Filter UI | Modal sheet | Bottom sheet |
| Playlist/group home sections | Loaded when signed in | **Deferred** |
| Recent storage | `localStorage` | `shared_preferences` (same key) |
| Guest local songs | `storage.ts` section | **Never** |

---

## 14. Proposed mobile-only changes (not implemented)

| Change | Rationale |
|--------|-----------|
| Hide “Your playlists — coming in Phase 5” one-liner vs empty sections | Cleaner home vs web empty states — **await product** |
| Pull-to-refresh → `invalidateSongIndexCache` | Mobile pattern; web uses chunk0 listener only — **optional P1** |

---

## Worked examples (from web logic)

### Example A — Browse-all, 25 songs, page 2

- `isBrowsingAll = true`, `libraryResults.length = 25`, `libraryPage = 1`, `HOME_LIBRARY_PAGE_SIZE = 10`.
- `displayedResults = libraryResults.slice(10, 20)` — songs ranked 11–20 by `sortLibraryEntries`.
- `libraryPageCount = ceil(25/10) = 3`; pagination shows **2 / 3** (`HomePage.tsx:667`).
- `libraryCapped = false`; no cap banner.

### Example B — Search with 150 matches

- User types `"worship"`; `isBrowsingAll = false`.
- `libraryResults` has 150 ranked entries.
- `displayedResults = libraryResults.slice(0, 100)`.
- `libraryCapped = true`; banner: **“Showing 100 of 150 songs — search or filter to narrow the list.”**
- No Prev/Next (`655` condition false).

### Example C — Filter-only, 150 matches (key = `C`)

- `searchQuery` empty, `keyFilter = "C"`, `isBrowsingAll = false`.
- `libraryResults` = all `key === "C"` sorted by `updatedAtMs` / title (empty-token rank path).
- Same as B: show **100**, cap banner if **> 100**, **no pagination**.

---

## Appendix: Key web → hook wiring

- `libraryResults` = `useSongSearch(...)` → `filterSongIndex` (`HomePage.tsx:142-148`, `useSongSearch.ts:16-18`).
- `libraryArtists` = `collectLibraryArtists(indexEntries)`; stale artist cleared (`HomePage.tsx:131-140`).
- Filter button label = `libraryFilterLabel` → `"Filter"` or `"Filter · {key} · {language label} · {artist}"` (`LibraryFilterSheet.tsx:194-220`).
- Empty list copy: no index → **“No songs in the library yet.”**; else **“No songs match your search.”** (`HomePage.tsx:631-633`).

---

*Phase B sections (`Flutter implementation map`, `Verified intentional diffs`, `Open parity risks`, manual QA) to be appended after Flutter implementation.*

---

## Flutter implementation map (Phase B)

| Web source | Flutter path |
|------------|----------------|
| `songIndex.ts` / `songIndexCache.ts` | `lib/data/repositories/song_index_repository.dart` |
| `SongIndexEntry` | `lib/data/models/song_index_entry.dart` |
| `songSearchRank.ts` | `lib/domain/song_search_rank.dart` (+ `filterSongIndex` alias) |
| `constants.ts` (browse caps) | `lib/domain/constants.dart`, `lib/domain/library_browse.dart` |
| `libraryArtists.ts` | `lib/domain/library_artists.dart` |
| `languageTags.ts` / `libraryFilterLabel` | `lib/domain/language_tags.dart` |
| `recentSongs.ts` | `lib/data/repositories/recent_songs_repository.dart` |
| `HomePage.tsx` | `lib/features/library/home_screen.dart` + `widgets/*` |
| `/song/[id]` stub | `lib/features/song/song_placeholder_screen.dart`, route `/song/:id` (root nav) |
| Riverpod wiring | `lib/providers/song_index_providers.dart` |

**Behavior parity:** progressive chunk0 load with `bestCount` guard; browse-all 10/page without 100 cap; search/filter cap 100 + banner copy; guest library; chunk0 snapshot debounce 400ms → `invalidateSongIndexCache`; recent songs key `lf-recent-songs` (max 10) on placeholder open.

**Tests:** `test/domain/song_search_rank_test.dart` (web rank fixtures + browse cap cases), `test/domain/library_artists_test.dart`.

### Verified intentional diffs

| Topic | Flutter |
|-------|---------|
| Home path | `/home` (Phase 1 shell) |
| Playlist / group sections | Omitted until Phase 5 |
| Search suggestions dropdown | Not in Phase 2 (P1 on web) |
| Pull-to-refresh | Calls index retry / reload (mobile UX) |

### Open parity risks / manual QA

- **Not run on device:** full index load, pagination beyond 100 songs, offline-after-first-load, admin index refresh via chunk0 listener.
- **Search suggestions (P1):** deferred.

