# Document 4 — API / Client Usage Patterns (SDK-First)

## 4.1 Canonical Queries & Mutations

All operations use the Firebase Web SDK (`firebase/firestore`). These patterns are reusable across web, iOS, Android, and Flutter SDKs with only syntax changes.

---

### 4.1.1 Songs

#### `listSongs(options?)` — Paginated song list

```typescript
import { collection, query, orderBy, limit, startAfter, where, getDocs } from 'firebase/firestore';

async function listSongs(options?: {
  pageSize?: number;        // default 20
  lastDoc?: DocumentSnapshot;  // cursor for pagination
  key?: string;             // filter by originalKey
  tag?: string;             // filter by tag
  searchPrefix?: string;    // title prefix search
}) {
  const songsRef = collection(db, 'songs');
  const constraints = [];

  if (options?.tag) {
    constraints.push(where('tags', 'array-contains', options.tag));
  }
  if (options?.key) {
    constraints.push(where('originalKey', '==', options.key));
  }
  if (options?.searchPrefix) {
    const lower = options.searchPrefix.toLowerCase();
    constraints.push(where('titleLower', '>=', lower));
    constraints.push(where('titleLower', '<', lower + '\uf8ff'));
  }

  constraints.push(orderBy('titleLower'));
  constraints.push(limit(options?.pageSize ?? 20));

  if (options?.lastDoc) {
    constraints.push(startAfter(options.lastDoc));
  }

  const q = query(songsRef, ...constraints);
  return getDocs(q);
}
```

> **Limitation:** Firestore cannot combine `array-contains` with range queries (`>=`/`<`). If both tag and search prefix are needed, filter tag server-side and search prefix client-side, or use a separate search index.

#### `getSong(songId)` — Single song by ID

```typescript
import { doc, getDoc } from 'firebase/firestore';

async function getSong(songId: string) {
  const songRef = doc(db, 'songs', songId);
  const snap = await getDoc(songRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
```

#### `createSong(payload)` — Admin creates a new song

```typescript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

async function createSong(payload: {
  title: string;
  originalKey: string;
  sections: Section[];
  artist?: string;
  tempo?: number;
  tags?: string[];
  ccli?: string;
  copyright?: string;
  notes?: string;
}) {
  return addDoc(collection(db, 'songs'), {
    ...payload,
    titleLower: payload.title.toLowerCase(),
    tags: payload.tags ?? [],
    version: 1,
    createdBy: auth.currentUser!.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
```

#### `updateSong(songId, updates)` — Admin updates song metadata

```typescript
import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';

async function updateSong(songId: string, updates: Partial<Song>) {
  const songRef = doc(db, 'songs', songId);
  return updateDoc(songRef, {
    ...updates,
    ...(updates.title ? { titleLower: updates.title.toLowerCase() } : {}),
    version: increment(1),
    updatedAt: serverTimestamp(),
  });
}
```

#### `deleteSong(songId)` — Admin deletes a song

```typescript
import { doc, deleteDoc } from 'firebase/firestore';

async function deleteSong(songId: string) {
  return deleteDoc(doc(db, 'songs', songId));
}
```

---

### 4.1.2 Sessions

#### `createSession(payload)` — Admin creates a session

```typescript
async function createSession(payload: {
  title: string;
  serviceType: 'friday' | 'sunday_morning' | 'sunday_evening';
  date: Date;
}) {
  return addDoc(collection(db, 'sessions'), {
    ...payload,
    date: Timestamp.fromDate(payload.date),
    songCount: 0,
    status: 'draft',
    createdBy: auth.currentUser!.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
```

#### `getSessionsByServiceType(serviceType)` — List sessions for a service

```typescript
async function getSessionsByServiceType(serviceType: string) {
  const q = query(
    collection(db, 'sessions'),
    where('serviceType', '==', serviceType),
    orderBy('date', 'desc'),
    limit(10)
  );
  return getDocs(q);
}
```

#### `getUpcomingSessions()` — All upcoming sessions

```typescript
async function getUpcomingSessions() {
  const now = Timestamp.now();
  const q = query(
    collection(db, 'sessions'),
    where('date', '>=', now),
    orderBy('date', 'asc'),
    limit(20)
  );
  return getDocs(q);
}
```

#### `addSongToSession(sessionId, songId, songTitle, keyOverride?)` — Add song to set list

```typescript
async function addSongToSession(
  sessionId: string,
  songId: string,
  songTitle: string,
  keyOverride?: string
) {
  // Get current song count for order
  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);
  const currentCount = sessionSnap.data()?.songCount ?? 0;

  // Add to subcollection
  const sessionSongsRef = collection(db, 'sessions', sessionId, 'sessionSongs');
  await addDoc(sessionSongsRef, {
    songId,
    songTitle,
    order: currentCount,
    keyOverride: keyOverride ?? null,
    notes: null,
    addedBy: auth.currentUser!.uid,
    addedAt: serverTimestamp(),
  });

  // Update parent count
  await updateDoc(sessionRef, {
    songCount: increment(1),
    updatedAt: serverTimestamp(),
  });
}
```

#### `getSessionSongs(sessionId)` — Get ordered songs in a session

```typescript
async function getSessionSongs(sessionId: string) {
  const q = query(
    collection(db, 'sessions', sessionId, 'sessionSongs'),
    orderBy('order', 'asc')
  );
  return getDocs(q);
}
```

#### `removeSongFromSession(sessionId, entryId)` — Remove song from session

```typescript
async function removeSongFromSession(sessionId: string, entryId: string) {
  await deleteDoc(doc(db, 'sessions', sessionId, 'sessionSongs', entryId));
  await updateDoc(doc(db, 'sessions', sessionId), {
    songCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
}
```

#### `reorderSessionSongs(sessionId, orderedEntryIds)` — Reorder set list

```typescript
async function reorderSessionSongs(sessionId: string, orderedEntryIds: string[]) {
  const batch = writeBatch(db);
  orderedEntryIds.forEach((entryId, index) => {
    const ref = doc(db, 'sessions', sessionId, 'sessionSongs', entryId);
    batch.update(ref, { order: index });
  });
  batch.update(doc(db, 'sessions', sessionId), { updatedAt: serverTimestamp() });
  await batch.commit();
}
```

---

### 4.1.3 Song Edits (Draft Workflow)

#### `createDraft(songId)` — Start editing a song

```typescript
async function createDraft(songId: string) {
  const song = await getSong(songId);
  if (!song) throw new Error('Song not found');

  return addDoc(collection(db, 'songEdits'), {
    songId,
    status: 'draft',
    title: song.title,
    originalKey: song.originalKey,
    sections: song.sections,
    notes: '',
    version: song.version + 1,
    editedBy: auth.currentUser!.uid,
    createdAt: serverTimestamp(),
    publishedAt: null,
  });
}
```

#### `publishDraft(editId)` — Publish a draft (batched write)

```typescript
async function publishDraft(editId: string) {
  const editRef = doc(db, 'songEdits', editId);
  const editSnap = await getDoc(editRef);
  const edit = editSnap.data()!;

  const songRef = doc(db, 'songs', edit.songId);

  const batch = writeBatch(db);

  // 1. Archive current song state
  const archiveRef = doc(collection(db, 'songEdits'));
  const currentSong = (await getDoc(songRef)).data()!;
  batch.set(archiveRef, {
    songId: edit.songId,
    status: 'archived',
    title: currentSong.title,
    originalKey: currentSong.originalKey,
    sections: currentSong.sections,
    notes: 'Auto-archived on publish',
    version: currentSong.version,
    editedBy: auth.currentUser!.uid,
    createdAt: serverTimestamp(),
    publishedAt: serverTimestamp(),
  });

  // 2. Apply draft to song
  batch.update(songRef, {
    title: edit.title,
    titleLower: edit.title.toLowerCase(),
    originalKey: edit.originalKey,
    sections: edit.sections,
    version: edit.version,
    updatedAt: serverTimestamp(),
  });

  // 3. Delete draft
  batch.delete(editRef);

  await batch.commit();
}
```

---

## 4.2 Offline Strategy

### 4.2.1 Enable Persistence (once, at app init)

```typescript
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
```

> This enables IndexedDB-based offline persistence. Reads will serve from cache when offline. Writes queue and sync when reconnected.

### 4.2.2 Session Pre-Fetch (Cache for Offline)

```typescript
async function cacheSessionForOffline(sessionId: string) {
  // 1. Fetch session metadata (auto-cached by persistence layer)
  await getDoc(doc(db, 'sessions', sessionId));

  // 2. Fetch all session songs (auto-cached)
  const sessionSongs = await getSessionSongs(sessionId);

  // 3. Fetch each referenced song (auto-cached)
  const songFetches = sessionSongs.docs.map(entry =>
    getDoc(doc(db, 'songs', entry.data().songId))
  );
  await Promise.all(songFetches);

  // All documents are now in IndexedDB cache
  // They will be served from cache when offline
}
```

### 4.2.3 Conflict Handling

| Scenario | Behavior |
|---|---|
| Musician reads song offline | Served from cache, no conflict |
| Admin edits song while musician is offline | Musician sees stale version until reconnect; no data loss |
| Two admins edit same song | Last write wins (Firestore default); use version field to detect conflicts in UI |
| Session updated while musician offline | Session and song list auto-update on reconnect via snapshot listeners |

### 4.2.4 Online/Offline Detection

```typescript
// React hook for online status
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOnline;
}
```

---

## 4.3 Performance Notes

### Pagination
- Always use `limit()` + `startAfter()` cursor pagination
- Never fetch all 10,000+ songs at once
- Page size: 20 for song list, 10 for session list
- Store last document snapshot for cursor

### Field Limiting
- Firestore doesn't support field projection in client SDK
- For song list, only display `title`, `originalKey`, `tags` — all in the document anyway
- The `sections` array is the heaviest field but typically 2-5 KB — acceptable for single-doc reads

### Avoid Large Reads
- Use `getDoc()` (single read) over `getDocs()` when fetching by ID
- Use real-time listeners (`onSnapshot`) sparingly — only for active session view and song detail
- Unsubscribe listeners on component unmount

### Denormalization
- `songTitle` in `sessionSongs` avoids a join when listing session set list
- `songCount` in `sessions` avoids counting subcollection docs
- `titleLower` in `songs` enables case-insensitive prefix search without Cloud Functions

### Batched Writes
- Use `writeBatch()` for multi-document updates (publish draft, reorder session)
- Maximum 500 operations per batch (more than enough for our use cases)

### Caching
- Firestore persistence caches all read documents in IndexedDB
- No additional caching layer needed
- Documents auto-evict on LRU basis if cache grows too large (configurable)

---

## 4.4 Service Layer Architecture (for Web App)

```
src/
├── lib/
│   ├── firebase.ts          # Firebase app + auth + db initialization
│   ├── firestore/
│   │   ├── songs.ts         # listSongs, getSong, createSong, updateSong, deleteSong
│   │   ├── sessions.ts      # createSession, getSessionsByServiceType, etc.
│   │   ├── sessionSongs.ts  # addSongToSession, removeSong, reorder
│   │   ├── songEdits.ts     # createDraft, publishDraft, discardDraft
│   │   └── users.ts         # getUser, updateProfile
│   ├── hooks/
│   │   ├── useSongs.ts      # React hook wrapping listSongs with pagination state
│   │   ├── useSong.ts       # React hook wrapping getSong with real-time listener
│   │   ├── useSessions.ts   # React hook for session list
│   │   └── useAuth.ts       # React hook for auth state
│   ├── engine.ts            # (existing) transpose logic — unchanged
│   ├── types.ts             # (existing + extended) TypeScript types
│   └── storage.ts           # (deprecated) localStorage — replaced by Firestore
```

> The `firestore/` modules are pure SDK calls with no React dependency. They can be copied verbatim into a Flutter/Dart app (adjusting syntax) or a React Native app. The `hooks/` layer is React-specific.
