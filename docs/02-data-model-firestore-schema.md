# Document 2 — Data Model & Firestore Schema

## 2.1 Collection Overview

```
firestore-root/
├── songs/           (10,000+ documents)
│   └── {songId}
├── songEdits/       (draft/version documents, linked to songId)
│   └── {editId}
├── sessions/        (service sessions / playlists)
│   └── {sessionId}
│       └── sessionSongs/   (subcollection: ordered songs in this session)
│           └── {sessionSongId}
├── users/           (minimal user profiles + roles)
│   └── {uid}
└── meta/            (app-level config, counters)
    └── stats
```

---

## 2.2 `songs` Collection

Each document = one published song.

### Field Definitions

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `title` | `string` | ✅ | Song title | `"Good Good Father"` |
| `titleLower` | `string` | ✅ | Lowercase title for case-insensitive search | `"good good father"` |
| `artist` | `string` | ❌ | Artist / writer | `"Chris Tomlin"` |
| `originalKey` | `string` | ✅ | Canonical key (one of 12 major keys) | `"A"` |
| `tempo` | `number \| null` | ❌ | BPM | `72` |
| `tags` | `string[]` | ❌ | Searchable tags (max 20) | `["worship", "contemporary", "communion"]` |
| `sections` | `Section[]` | ✅ | Structured lyrics + chords (see below) | *(see example)* |
| `ccli` | `string \| null` | ❌ | CCLI song number | `"7036612"` |
| `copyright` | `string \| null` | ❌ | Copyright notice | `"© 2014 Capitol CMG"` |
| `notes` | `string \| null` | ❌ | Internal notes for worship team | `"Slow build on bridge"` |
| `version` | `number` | ✅ | Incremented on each publish | `1` |
| `createdBy` | `string` | ✅ | UID of uploader | `"uid_abc123"` |
| `createdAt` | `timestamp` | ✅ | Firestore server timestamp | *(auto)* |
| `updatedAt` | `timestamp` | ✅ | Last publish timestamp | *(auto)* |

### `Section` (embedded object in `sections` array)

| Field | Type | Description | Example |
|---|---|---|---|
| `label` | `string` | Section heading | `"Chorus"` |
| `lines` | `LyricLine[]` | Lines in this section | *(see below)* |

### `LyricLine` (embedded in `Section.lines`)

| Field | Type | Description | Example |
|---|---|---|---|
| `lyrics` | `string` | Full lyric text for this line | `"You're a Good, Good Father"` |
| `chords` | `ChordMark[]` | Chords positioned above lyrics | *(see below)* |

### `ChordMark` (embedded in `LyricLine.chords`)

| Field | Type | Description | Example |
|---|---|---|---|
| `chord` | `string` | Chord symbol | `"D"` |
| `position` | `number` | Character index in lyric text | `0` |

> **Design note:** This structure is identical to the existing MVP's `types.ts` (`Song → Section[] → LyricLine → ChordMark[]`). The `sections` array is bounded (typical song: 4-8 sections, 4-6 lines each, ~30 chords total). A song document will be ~2-5 KB, well within Firestore's 1 MB limit even for complex arrangements.

### Chord/Lyric Representation

We use **position-indexed ChordPro-like** format:
- Chords are stored as an array of `{chord, position}` objects
- `position` = character index in the lyric string where the chord sits
- Client renders chords in a row above the lyric row, offset by `position` characters (using `ch` units in monospace)

**Why this over inline `[C]lyrics` format:**
- Separates data from display — easier to transpose, validate, migrate
- Supports multiple chord placements per syllable
- Existing MVP already uses this format and the editor produces it
- ChordPro-style `[C]text` is used only in the preset builder helper (`L()` function) for convenience

**Stored example:**
```json
{
  "lyrics": "You're a Good, Good Father",
  "chords": [
    { "chord": "D", "position": 0 },
    { "chord": "A", "position": 16 }
  ]
}
```

**Rendered as:**
```
D                A
You're a Good, Good Father
```

---

## 2.3 `songEdits` Collection (Draft/Versioning)

Each document = one draft or archived version of a song.

| Field | Type | Required | Description |
|---|---|---|---|
| `songId` | `string` | ✅ | Reference to parent song document |
| `status` | `string` | ✅ | `"draft"` or `"archived"` |
| `sections` | `Section[]` | ✅ | The edited sections (same structure as song) |
| `originalKey` | `string` | ✅ | Key at time of edit |
| `title` | `string` | ✅ | Title at time of edit (in case it changed) |
| `notes` | `string` | ❌ | Edit notes / changelog |
| `version` | `number` | ✅ | Version number this edit represents |
| `editedBy` | `string` | ✅ | UID of editor |
| `createdAt` | `timestamp` | ✅ | When draft was created |
| `publishedAt` | `timestamp \| null` | ❌ | When archived (was published) |

### Edit Workflow

```
1. Admin clicks "Edit" on a song
2. System creates a `songEdits` doc with status: "draft", copying current song data
3. Admin edits the draft (changes saved to the songEdits doc)
4. Admin clicks "Publish":
   a. Current song's sections/data → new songEdits doc with status: "archived"
   b. Draft's sections/data → copied into the song document
   c. Song.version incremented
   d. Draft document deleted (or marked archived)
5. Admin can "Discard" draft → delete the draft songEdits doc
```

**Why a flat collection (not subcollection)?**
- Subcollection under `songs/{id}/edits` would work but makes cross-song queries harder (e.g., "show me all open drafts")
- Flat `songEdits` with `songId` field allows `where("status", "==", "draft")` globally
- Typical volume: ≤1 draft per song at a time, archived versions grow slowly

---

## 2.4 `sessions` Collection

Each document = one worship service session (a set list).

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `title` | `string` | ✅ | Session display name | `"Sunday Morning — Sep 14"` |
| `serviceType` | `string` | ✅ | `"friday"`, `"sunday_morning"`, `"sunday_evening"` | `"sunday_morning"` |
| `date` | `timestamp` | ✅ | Service date | `2026-09-14T00:00:00Z` |
| `songCount` | `number` | ✅ | Denormalized count of songs in session | `5` |
| `createdBy` | `string` | ✅ | UID of session creator | `"uid_abc123"` |
| `createdAt` | `timestamp` | ✅ | When session was created | *(auto)* |
| `updatedAt` | `timestamp` | ✅ | Last modification | *(auto)* |
| `status` | `string` | ✅ | `"draft"`, `"published"` | `"published"` |

### `sessionSongs` Subcollection (`sessions/{id}/sessionSongs`)

Each document = one song reference in the session set list.

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `songId` | `string` | ✅ | Reference to `songs/{songId}` | `"song_abc123"` |
| `songTitle` | `string` | ✅ | Denormalized title (for fast list display without join) | `"Good Good Father"` |
| `order` | `number` | ✅ | Sort position in set list (0-indexed) | `2` |
| `keyOverride` | `string \| null` | ❌ | Key to play this song in for this session | `"G"` |
| `notes` | `string \| null` | ❌ | Per-song session notes | `"Start with acoustic only"` |
| `addedBy` | `string` | ✅ | UID of who added it | `"uid_abc123"` |
| `addedAt` | `timestamp` | ✅ | When added to session | *(auto)* |

> **Why subcollection instead of array?**
> - Arrays of song references would become unwieldy and require re-writing the entire session doc to reorder
> - Subcollection allows individual song add/remove/reorder without touching the parent doc
> - Each `sessionSong` doc is tiny (~200 bytes), well within Firestore limits
> - Querying `sessions/{id}/sessionSongs` ordered by `order` is a simple query

---

## 2.5 `users` Collection

Minimal user profile. Document ID = Firebase Auth UID.

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `email` | `string` | ✅ | User's email | `"musician@church.org"` |
| `displayName` | `string` | ✅ | Display name | `"Sarah K"` |
| `role` | `string` | ✅ | `"admin"` or `"musician"` | `"musician"` |
| `createdAt` | `timestamp` | ✅ | Account creation | *(auto)* |
| `lastLoginAt` | `timestamp` | ❌ | Last login timestamp | *(auto)* |

---

## 2.6 `meta` Collection

App-level metadata. Small collection, rarely read.

### `meta/stats`

| Field | Type | Description |
|---|---|---|
| `totalSongs` | `number` | Maintained via Cloud Function or increment (optional, for dashboard) |
| `totalSessions` | `number` | Same |
| `lastUpdated` | `timestamp` | When stats were last computed |

---

## 2.7 Indexes

### Composite Indexes Required

| Collection | Fields | Query Pattern |
|---|---|---|
| `songs` | `titleLower` ASC | Search by title prefix (`>=`, `<` range) |
| `songs` | `originalKey` ASC, `titleLower` ASC | Filter by key + sort by title |
| `songs` | `tags` ARRAY_CONTAINS, `titleLower` ASC | Filter by tag + sort by title |
| `songs` | `createdAt` DESC | Recent songs list |
| `sessions` | `serviceType` ASC, `date` DESC | Sessions by service type, newest first |
| `sessions` | `date` DESC | All sessions, newest first |
| `songEdits` | `songId` ASC, `status` ASC | Find drafts for a specific song |
| `songEdits` | `status` ASC, `createdAt` DESC | All open drafts (admin dashboard) |
| `sessionSongs` | `order` ASC | *(Single-field, auto-created)* |

---

## 2.8 Example Documents

### Example 1: Song Document

```json
{
  "__collection__": "songs",
  "__id__": "good-good-father",
  "title": "Good Good Father",
  "titleLower": "good good father",
  "artist": "Chris Tomlin",
  "originalKey": "A",
  "tempo": 72,
  "tags": ["worship", "contemporary", "adoration"],
  "sections": [
    {
      "label": "Verse 1",
      "lines": [
        {
          "lyrics": "Oh, I've heard a thousand stories",
          "chords": [
            { "chord": "A", "position": 0 },
            { "chord": "E/G#", "position": 20 }
          ]
        },
        {
          "lyrics": "Of what they think You're like",
          "chords": [
            { "chord": "F#m", "position": 0 },
            { "chord": "D", "position": 15 }
          ]
        }
      ]
    },
    {
      "label": "Chorus",
      "lines": [
        {
          "lyrics": "You're a Good, Good Father",
          "chords": [
            { "chord": "D", "position": 0 },
            { "chord": "A", "position": 16 }
          ]
        }
      ]
    }
  ],
  "ccli": "7036612",
  "copyright": "© 2014 Capitol CMG Paragon",
  "notes": "Slow build, keys lead intro",
  "version": 1,
  "createdBy": "uid_admin001",
  "createdAt": "2026-09-01T10:00:00Z",
  "updatedAt": "2026-09-01T10:00:00Z"
}
```

### Example 2: Session Document

```json
{
  "__collection__": "sessions",
  "__id__": "session_20260914_sun_am",
  "title": "Sunday Morning — Sep 14, 2026",
  "serviceType": "sunday_morning",
  "date": "2026-09-14T00:00:00Z",
  "songCount": 5,
  "createdBy": "uid_admin001",
  "createdAt": "2026-09-10T14:00:00Z",
  "updatedAt": "2026-09-12T09:30:00Z",
  "status": "published"
}
```

### Example 3: Session Song (subcollection document)

```json
{
  "__collection__": "sessions/session_20260914_sun_am/sessionSongs",
  "__id__": "ss_001",
  "songId": "good-good-father",
  "songTitle": "Good Good Father",
  "order": 0,
  "keyOverride": "G",
  "notes": "Acoustic intro, build on chorus",
  "addedBy": "uid_admin001",
  "addedAt": "2026-09-10T14:05:00Z"
}
```

### Example 4: Song Edit (Draft)

```json
{
  "__collection__": "songEdits",
  "__id__": "edit_ggf_draft_001",
  "songId": "good-good-father",
  "status": "draft",
  "title": "Good Good Father",
  "originalKey": "A",
  "sections": [
    {
      "label": "Verse 1",
      "lines": [
        {
          "lyrics": "Oh, I've heard a thousand stories",
          "chords": [
            { "chord": "A", "position": 0 },
            { "chord": "E", "position": 20 }
          ]
        }
      ]
    }
  ],
  "notes": "Changed E/G# to E in verse 1 for simplicity",
  "version": 2,
  "editedBy": "uid_admin001",
  "createdAt": "2026-09-11T08:00:00Z",
  "publishedAt": null
}
```

### Example 5: User Document

```json
{
  "__collection__": "users",
  "__id__": "uid_musician042",
  "email": "sarah@church.org",
  "displayName": "Sarah K",
  "role": "musician",
  "createdAt": "2026-08-15T12:00:00Z",
  "lastLoginAt": "2026-09-11T07:30:00Z"
}
```

---

## 2.9 Firestore Document Size Budget

| Document Type | Estimated Size | Notes |
|---|---|---|
| Song (complex, 8 sections) | ~3-5 KB | Well within 1 MB limit |
| Song (simple, 3 sections) | ~1-2 KB | Most songs |
| Session | ~300 bytes | Metadata only, songs in subcollection |
| Session Song | ~200 bytes | Reference + overrides |
| Song Edit | ~3-5 KB | Copy of song data |
| User | ~200 bytes | Minimal profile |

**At 10,000 songs:** Total songs data ≈ 20-50 MB. Firestore handles this easily.
Reads are the cost concern — see API patterns (Document 4) for pagination and caching strategy.
