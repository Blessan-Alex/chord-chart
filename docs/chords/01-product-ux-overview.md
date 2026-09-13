# Document 1 — Product & UX Overview (Web First)

## 1.1 User Types

| Role | Description | Capabilities |
|---|---|---|
| **Admin / Uploader** | Worship leader or designated editor | Create/edit/delete songs, manage original chords, publish drafts, manage sessions, full read access |
| **Musician (Band Member)** | Instrumentalist, vocalist, singer | Browse/search songs, view lyrics + chords, transpose, add songs to sessions, download sessions for offline, view shared sessions |

> **Auth:** Firebase Authentication (email/password initially; Google sign-in optional later). Every user has a `role` field in their Firestore `users` document. No self-registration for admin — set via Firebase console or a future admin tool.

---

## 1.2 Core User Flows

### Flow 1 — Browse & Search Songs
```
Home → Song List (paginated, 20/page) → Filter by key / tag / search term → Tap song
```
- Default sort: alphabetical by title
- Quick filters: key (dropdown), tag (chips), free-text search (title + artist)
- Pagination via Firestore cursor (startAfter last doc)

### Flow 2 — View Song (Lyrics + Chords)
```
Song List → Song Detail → See sections (Verse, Chorus…) with chords above lyrics
                        → Transpose: pick target key → chords update live
                        → Toggle: Chords ↔ Numbers (Nashville system)
```
- Reuses existing `ChordLine` + `engine.ts` transpose logic
- Section labels (`[Verse 1]`, `[Chorus]`) rendered as dividers
- Sticky header with key picker + view toggle (already in MVP)

### Flow 3 — Add Song to Session / Playlist
```
Song Detail → "Add to Session" button → Pick or create a session → Song added with order index
```
- Session = a set of songs for a specific service (Friday PM, Sunday AM, Sunday PM)
- Each session has a date, service type, and ordered list of song references

### Flow 4 — Session Builder (Admin)
```
Home → Sessions tab → "New Session" → Pick service type + date
     → Search & add songs → Drag to reorder → Save → Share link
```
- Admin creates session, picks songs from library
- Reorder via drag-and-drop or up/down buttons
- Each song in session stores per-session key override (e.g., "play this in G tonight")

### Flow 5 — Session View (Band)
```
Shared link or Sessions tab → Session detail → See ordered song list
                             → Tap song → Song detail (with session key applied)
                             → "Download All" → Cache for offline
```
- Musicians see the session the leader built
- Per-song key from session overrides default original key
- Offline download caches all song documents in that session

### Flow 6 — Offline Use
```
Session View → "Cache for Offline" → Firestore offline persistence stores docs
             → Airplane mode → Session and songs still load from cache
             → Reconnect → Sync any pending reads
```
- Firestore SDK offline persistence enabled by default
- Session cache = pre-fetch all `songs` documents referenced by that session
- Visual indicator: "Offline" badge in header when `navigator.onLine === false`

### Flow 7 — Edit Original Chords (Admin)
```
Song Detail → "Edit" button (admin only) → Opens editor → Modify chords/sections
           → Save as draft → Preview draft → Publish → Draft replaces current version
```
- Draft stored as a separate document (`songEdits` collection)
- Publish = copy draft data over current song document + archive version
- Non-admin users never see drafts — they always see the published song

---

## 1.3 UI Map — Key Screens

```
┌──────────────────────────────────────────────────┐
│                    App Shell                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Songs   │  │ Sessions │  │ Settings │       │
│  │  (tab)   │  │  (tab)   │  │  (tab)   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │             │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼──────┐      │
│  │Song List │  │Session   │  │Profile    │      │
│  │+ Search  │  │List      │  │Offline Mgr│      │
│  └────┬─────┘  └────┬─────┘  └───────────┘      │
│       │              │                            │
│  ┌────▼─────┐  ┌────▼──────┐                     │
│  │Song      │  │Session    │                     │
│  │Detail    │  │Builder    │                     │
│  │(view)    │  │(admin)    │                     │
│  └────┬─────┘  └────┬──────┘                     │
│       │              │                            │
│  ┌────▼─────┐  ┌────▼──────┐                     │
│  │Song      │  │Session    │                     │
│  │Editor    │  │View       │                     │
│  │(admin)   │  │(band)     │                     │
│  └──────────┘  └───────────┘                     │
└──────────────────────────────────────────────────┘
```

### Screen Details

| Screen | Route | Purpose | Key Elements |
|---|---|---|---|
| **Song List** | `/` | Browse all songs, search, filter | Search bar, key/tag filters, paginated list, "Add Song" (admin) |
| **Song Detail** | `/song/[id]` | View lyrics + chords, transpose | Sticky key picker, chords/numbers toggle, section layout, "Add to Session", "Edit" (admin) |
| **Song Editor** | `/song/[id]/edit` | Edit chords/lyrics (admin) | Interactive editor (existing `InteractiveEditor`), save as draft, publish |
| **Import Song** | `/import` | Add new song (admin) | Title, key, paste lyrics, place chords (existing flow) |
| **Session List** | `/sessions` | View upcoming/past sessions | Grouped by service type, date sorted |
| **Session Builder** | `/sessions/new` or `/sessions/[id]/edit` | Create/edit session (admin) | Song search + add, reorder, per-song key override |
| **Session View** | `/sessions/[id]` | Band views session set list | Ordered songs, tap to open detail, "Cache Offline" button |
| **Settings** | `/settings` | Profile, offline management | Offline status, cached sessions list, clear cache, sign out |

---

## 1.4 UX Requirements

| Requirement | Implementation |
|---|---|
| **Fast load** | Firestore query with limit(20), cursor pagination, minimal bundle |
| **Readable chord layout** | Monospace font, chords positioned at character offsets above lyrics (existing system) |
| **Transpose control** | Sticky header with key picker dropdown, instant client-side recalculation |
| **Offline indicator** | Listen to `online`/`offline` events, show banner/badge |
| **Session sharing** | Shareable URL (`/sessions/[id]`), authenticated users with `musician` role can view |
| **Mobile-first** | Responsive layout, touch-friendly targets (min 44px), sticky header |
| **Dark mode** | CSS `prefers-color-scheme` (already implemented) |

---

## 1.5 What Changes from Current MVP

| Current MVP | Firebase Evolution |
|---|---|
| localStorage for songs | Firestore `songs` collection |
| Hardcoded presets in `presets.ts` | Seed data migrated to Firestore documents |
| No auth | Firebase Auth (email/password) |
| No sessions/playlists | `sessions` + `sessionSongs` collections |
| No search beyond local scan | Firestore queries with indexes |
| No offline strategy | Firestore offline persistence + session pre-fetch |
| No edit safety | Draft/publish workflow via `songEdits` collection |
| No roles | `users` collection with `role` field + security rules |
