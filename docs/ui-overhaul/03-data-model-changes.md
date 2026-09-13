# Data Model Changes (Playlists, Groups, Users)

Firestore shapes for Phases B, F, G, J. **Collection rename deferred** — UI says "Playlist", collection can stay `sessions` until migration ticket F-14.

---

## Users (`users/{uid}`) — extend

```typescript
type UserProfile = {
  email: string;
  displayName: string;      // "Alex Rivera"
  username: string;           // unique, lowercase, 3–20 chars, /^[a-z0-9_]+$/
  usernameLower: string;      // for uniqueness query
  role: "musician" | "admin"; // admin from custom claim only; role field read-only mirror
  avatarInitials: string;     // computed
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
};
```

**New index:** `users` collection group query on `usernameLower` (single-field).

**Username rules:** Set once at signup; change allowed once per 30 days (optional v2).

---

## Playlists (`sessions/{id}`) — extend fields

```typescript
type Playlist = {
  title: string;
  date: Timestamp;              // service date (keep)
  songCount: number;
  status: "draft" | "published";
  ownerId: string;              // creator uid
  ownerUsername: string;        // denormalized
  visibility: "private" | "shared" | "published";
  sharedWith: string[];         // uids with read access
  groupId: string | null;       // if owned by a group
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // deprecate display of serviceType; keep field for backward compat
  serviceType?: string;
};
```

**Playlist songs** (`sessions/{id}/sessionSongs/{entryId}`) — unchanged shape; rename in UI only.

---

## Groups (`groups/{id}`) — new

```typescript
type Group = {
  name: string;
  slug: string;
  ownerId: string;
  memberIds: string[];
  memberUsernames: string[];    // denormalized first names or @handles
  playlistCount: number;
  inviteCode: string;           // 8 char, rotatable
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type GroupMember = {
  uid: string;
  username: string;
  role: "owner" | "member";
  joinedAt: Timestamp;
};
```

Subcollection: `groups/{id}/members/{uid}`

---

## Invites (`invites/{id}`) — new (optional simple)

```typescript
type Invite = {
  type: "group" | "playlist";
  targetId: string;
  inviterId: string;
  inviteeEmail: string | null;
  inviteeUsername: string | null;
  status: "pending" | "accepted" | "declined";
  createdAt: Timestamp;
};
```

---

## Recently viewed (client-only v1)

`localStorage` `lf-recent-songs`: `{ songId, title, viewedAt }[]` max 10.

---

## Chord marks — extend for highlight placement (Phase E)

```typescript
type ChordMark = {
  chord: string;
  start: number;   // char index (inclusive)
  end: number;     // char index (exclusive); if start===end-1, single char
};
```

**Migration:** `position` → `start`; set `end = start + 1` for existing data in read layer.

---

## Admin stats queries

| Stat | Query |
|------|--------|
| Total songs | `songs` where status==active count (cached in `meta/stats`) |
| Playlists | `sessions` count (or owner filter) |
| Groups | `groups` count |

Update `meta/stats` on admin writes (client-side for Spark tier) or count on admin page load.
