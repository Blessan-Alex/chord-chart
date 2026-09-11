# Document 2 — Data Model & Firestore Schema

## 2.1 Collection Overview

```
firestore-root/
├── songs/              (published songs)
│   └── {songId}
├── songIndex/          (searchable library chunks — client read-only)
│   └── chunk0, chunk1, …
├── songEdits/          (drafts + archived versions)
│   └── {editId}
├── sessions/
│   └── {sessionId}
│       └── sessionSongs/
│           └── {sessionSongId}
├── users/
│   └── {uid}
└── meta/               (seed-only via Admin SDK)
    └── stats
```

---

## 2.2 `songs` Collection

Each document = one published song.

### Field Definitions

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `title` | `string` | ✅ | Song title | `"Good Good Father"` |
| `artist` | `string` | ❌ | Artist / writer | `"Chris Tomlin"` |
| `originalKey` | `string` | ✅ | One of 12 major keys | `"A"` |
| `status` | `string` | ✅ | `"active"` or `"archived"` (soft delete, R8) | `"active"` |
| `tempo` | `number \| null` | ❌ | BPM | `72` |
| `tags` | `string[]` | ❌ | Searchable tags (max 20) | `["worship", "contemporary"]` |
| `sections` | `Section[]` | ✅ | Structured lyrics + chords | *(see below)* |
| `ccli` | `string \| null` | ❌ | CCLI song number | `"7036612"` |
| `copyright` | `string \| null` | ❌ | Copyright notice | `"© 2014 Capitol CMG"` |
| `notes` | `string \| null` | ❌ | Internal notes | `"Slow build on bridge"` |
| `version` | `number` | ✅ | Incremented on publish (client transaction) | `1` |
| `createdBy` | `string` | ✅ | UID of uploader | `"uid_abc123"` |
| `createdAt` | `timestamp` | ✅ | Server timestamp | *(auto)* |
| `updatedAt` | `timestamp` | ✅ | Last publish timestamp | *(auto)* |

> **`titleLower` removed as primary search field.** Search uses `songIndex` chunks with local substring filter (R4). Optional `titleLower` may remain for sorting inside index entries only.

### `Section` / `LyricLine` / `ChordMark`

Identical to MVP `types.ts`:

```json
{
  "label": "Chorus",
  "lines": [{
    "lyrics": "You're a Good, Good Father",
    "chords": [
      { "chord": "D", "position": 0 },
      { "chord": "A", "position": 16 }
    ]
  }]
}
```

---

## 2.3 `songIndex` Collection (R4)

Denormalized search index. **Clients fetch chunks once, filter locally.**

| Field | Type | Description |
|---|---|---|
| `entries` | `IndexEntry[]` | ~2000 songs per chunk document |
| `updatedAt` | `timestamp` | Last rebuild |

### `IndexEntry` (embedded)

| Field | Type | Example |
|---|---|---|
| `id` | `string` | `"good-good-father"` |
| `title` | `string` | `"Good Good Father"` |
| `artist` | `string` | `"Chris Tomlin"` |
| `key` | `string` | `"A"` |
| `tags` | `string[]` | `["worship"]` |

**Queries:** Client fetches `songIndex/chunk0` … `chunkN` (1–5 reads total). No Firestore query on index fields. Substring search ("maker" → "Way Maker") runs in memory.

**Writes:** Admin SDK only — updated when songs are created/archived via seed script or publish flow.

---

## 2.4 `songEdits` Collection (Draft/Versioning)

| Field | Type | Required | Description |
|---|---|---|---|
| `songId` | `string` | ✅ | Parent song |
| `status` | `string` | ✅ | `"draft"` or `"archived"` |
| `baseVersion` | `number` | ✅ | Song `version` at draft creation (conflict detection, R6) |
| `sections` | `Section[]` | ✅ | Edited content |
| `originalKey` | `string` | ✅ | Key at edit time |
| `title` | `string` | ✅ | Title at edit time |
| `notes` | `string` | ❌ | Changelog |
| `version` | `number` | ✅ | Target version on publish |
| `editedBy` | `string` | ✅ | Editor UID |
| `createdAt` | `timestamp` | ✅ | Draft created |
| `publishedAt` | `timestamp \| null` | ❌ | When archived |

### Retention (R13)

Keep **last 10 archived** versions per `songId`. Older archives deleted by `publishDraft` transaction or periodic Admin SDK cleanup script. No Cloud Function required.

### Edit workflow

```
1. Admin → createDraft(songId) — copies song, sets baseVersion = song.version
2. Admin edits draft doc
3. publishDraft(editId) — runTransaction:
   a. Verify song.version == draft.baseVersion (else conflict)
   b. Archive current song → songEdits (status: archived)
   c. Apply draft → song doc, increment version
   d. Delete draft
   e. Prune archives > 10 for this songId
4. discardDraft → delete draft only
```

---

## 2.5 `sessions` Collection

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | ✅ | Display name |
| `serviceType` | `string` | ✅ | `friday`, `sunday_morning`, `sunday_evening` |
| `date` | `timestamp` | ✅ | Service date |
| `songCount` | `number` | ✅ | Denormalized count |
| `status` | `string` | ✅ | `draft`, `published` |
| `createdBy` | `string` | ✅ | Creator UID |
| `createdAt` / `updatedAt` | `timestamp` | ✅ | Timestamps |

### `sessionSongs` Subcollection

| Field | Type | Description |
|---|---|---|
| `songId` | `string` | Reference to `songs/{id}` |
| `songTitle` | `string` | Denormalized for list display |
| `order` | `number` | **Fractional** sort key (R7) — e.g. `1000`, `2000`, `1500` between |
| `keyOverride` | `string \| null` | Per-session key |
| `notes` | `string \| null` | Session notes |
| `addedBy` | `string` | UID |
| `addedAt` | `timestamp` | When added |

**Reorder:** Insert at midpoint between neighbours → **1 write** per drag, not N.

**Count repair:** `recountSessionSongs(sessionId)` — Admin or client utility if `songCount` drifts (no Cloud Function).

---

## 2.6 `users` Collection

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | ✅ | From Auth |
| `displayName` | `string` | ✅ | Display name |
| `role` | `string` | ✅ | Always `"musician"` on self-signup; **immutable** |
| `createdAt` | `timestamp` | ✅ | Signup time |
| `lastLoginAt` | `timestamp` | ❌ | Updated by client |

**Admin access:** `request.auth.token.admin` custom claim — **not** `users.role`. See `docs/03`.

---

## 2.7 `meta` Collection

Seed document `meta/stats` via Admin SDK at deploy. **No client writes. No Cloud Function maintenance (R1).**

| Field | Type | Description |
|---|---|---|
| `totalSongs` | `number` | Optional static seed value |
| `schemaVersion` | `number` | Plan version |
| `lastUpdated` | `timestamp` | Seed time |

Dashboard stats are optional; do not increment from client.

---

## 2.8 Indexes

### Composite indexes (`firestore.indexes.json`)

| Collection | Fields | Query pattern |
|---|---|---|
| `songs` | `status` ASC, `createdAt` DESC | Recent active songs (admin) |
| `songs` | `originalKey` ASC, `createdAt` DESC | Filter by key (admin, paginated) |
| `sessions` | `status` ASC, `date` DESC | Published sessions list (R18) |
| `sessions` | `serviceType` ASC, `date` DESC | By service type |
| `songEdits` | `songId` ASC, `status` ASC | Drafts per song |
| `songEdits` | `status` ASC, `createdAt` DESC | Open drafts dashboard |
| `sessionSongs` | `order` ASC | *(single-field, auto)* |

**Not needed:** `titleLower` prefix composite — search uses `songIndex`.

**Not needed:** Client queries on `songIndex` beyond `getDoc(chunkId)`.

---

## 2.9 Example Documents

### Song (active)

```json
{
  "title": "Good Good Father",
  "artist": "Chris Tomlin",
  "originalKey": "A",
  "status": "active",
  "sections": [ /* … */ ],
  "version": 1,
  "createdBy": "uid_admin001",
  "createdAt": "2026-09-01T10:00:00Z",
  "updatedAt": "2026-09-01T10:00:00Z"
}
```

### songIndex chunk

```json
{
  "entries": [
    { "id": "way-maker", "title": "Way Maker", "artist": "Sinach", "key": "E", "tags": ["worship"] },
    { "id": "good-good-father", "title": "Good Good Father", "artist": "Chris Tomlin", "key": "A", "tags": ["worship"] }
  ],
  "updatedAt": "2026-09-01T10:00:00Z"
}
```

### Song edit (draft)

```json
{
  "songId": "good-good-father",
  "status": "draft",
  "baseVersion": 1,
  "title": "Good Good Father",
  "originalKey": "A",
  "sections": [ /* … */ ],
  "version": 2,
  "editedBy": "uid_admin001",
  "createdAt": "2026-09-11T08:00:00Z",
  "publishedAt": null
}
```

---

## 2.10 Document size budget

| Document | Size | Notes |
|---|---|---|
| Song | 1–5 KB | Typical |
| songIndex chunk | ~50–100 KB | 2000 entries × ~50 bytes |
| Session | ~300 B | Songs in subcollection |
| User | ~200 B | Minimal |

At 10,000 songs: ~5 index chunks + 10k song docs ≈ 30–50 MB storage — well under 1 GB.

Read costs: see `docs/08-cost-budget.md`.
