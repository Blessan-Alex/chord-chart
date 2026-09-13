# Document 4 — API / Client Usage Patterns (SDK-First)

> **Spark constraints:** No per-keystroke Firestore queries. Library search = cached `songIndex`. Admin = custom claim. Offline = `getDocFromCache` first.

---

## 4.1 Songs

### `fetchSongIndex()` — One-time library load

```typescript
import { doc, getDoc } from 'firebase/firestore';

const CHUNK_IDS = ['chunk0', 'chunk1', 'chunk2', 'chunk3', 'chunk4'];

async function fetchSongIndex(): Promise<IndexEntry[]> {
  const chunks = await Promise.all(
    CHUNK_IDS.map((id) => getDoc(doc(db, 'songIndex', id)))
  );
  return chunks
    .filter((s) => s.exists())
    .flatMap((s) => s.data()!.entries as IndexEntry[]);
}
```

**Reads:** 1–5 per app session. Cache in memory + IndexedDB (Firestore persistence handles this automatically after first fetch).

### `useSongSearch` — Local filter (replaces P2-01/02/03)

```typescript
function useSongSearch(entries: IndexEntry[], query: string, keyFilter?: string) {
  const q = query.trim().toLowerCase();
  return useMemo(() => {
    let results = entries;
    if (keyFilter) results = results.filter((e) => e.key === keyFilter);
    if (!q) return results.sort((a, b) => a.title.localeCompare(b.title));
    return results
      .filter((e) =>
        e.title.toLowerCase().includes(q) ||
        (e.artist?.toLowerCase().includes(q) ?? false)
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [entries, q, keyFilter]);
}
```

**Reads per keystroke: 0.**

### `getSong(songId)` — Cache-first detail

```typescript
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';

async function getSong(songId: string) {
  const ref = doc(db, 'songs', songId);
  try {
    const cached = await getDocFromCache(ref);
    if (cached.exists()) return { id: cached.id, ...cached.data() };
  } catch { /* cache miss */ }
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
```

### `createSong(payload)` — Admin

```typescript
async function createSong(payload: CreateSongPayload) {
  // 1. Write song doc
  // 2. Patch songIndex chunk via Admin SDK or batched client update (admin only)
  // Include status: 'active', version: 1
}
```

### `archiveSong(songId)` — Soft delete (R8)

```typescript
async function archiveSong(songId: string) {
  await updateDoc(doc(db, 'songs', songId), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
  // Rebuild songIndex entry removal via Admin SDK or admin batch
}
```

Do **not** `deleteDoc` songs — breaks session references and history.

---

## 4.2 Sessions

### `addSongToSession` — Transaction + fractional order (R7)

```typescript
import { runTransaction } from 'firebase/firestore';

async function addSongToSession(sessionId: string, songId: string, songTitle: string) {
  await runTransaction(db, async (tx) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    const session = (await tx.get(sessionRef)).data()!;

    // Find max order in subcollection (or use session.songCount * 1000)
    const newOrder = (session.songCount + 1) * 1000;

    const entryRef = doc(collection(db, 'sessions', sessionId, 'sessionSongs'));
    tx.set(entryRef, {
      songId,
      songTitle,
      order: newOrder,
      keyOverride: null,
      addedBy: auth.currentUser!.uid,
      addedAt: serverTimestamp(),
    });
    tx.update(sessionRef, {
      songCount: session.songCount + 1,
      updatedAt: serverTimestamp(),
    });
  });
}
```

### `reorderSessionSong` — Fractional (1 write)

```typescript
async function reorderSessionSong(
  sessionId: string,
  entryId: string,
  prevOrder: number,
  nextOrder: number,
) {
  const mid = (prevOrder + nextOrder) / 2;
  await updateDoc(
    doc(db, 'sessions', sessionId, 'sessionSongs', entryId),
    { order: mid },
  );
}
```

### `recountSessionSongs(sessionId)` — Repair drift

```typescript
async function recountSessionSongs(sessionId: string) {
  const snap = await getDocs(
    query(collection(db, 'sessions', sessionId, 'sessionSongs'))
  );
  await updateDoc(doc(db, 'sessions', sessionId), { songCount: snap.size });
}
```

---

## 4.3 Song edits — `publishDraft` with transaction (R6)

```typescript
async function publishDraft(editId: string) {
  await runTransaction(db, async (tx) => {
    const editRef = doc(db, 'songEdits', editId);
    const editSnap = await tx.get(editRef);
    const edit = editSnap.data()!;

    const songRef = doc(db, 'songs', edit.songId);
    const songSnap = await tx.get(songRef);
    const song = songSnap.data()!;

    // Conflict check
    if (song.version !== edit.baseVersion) {
      throw new Error('Song was modified since draft was created');
    }

    // Archive current version
    const archiveRef = doc(collection(db, 'songEdits'));
    tx.set(archiveRef, {
      songId: edit.songId,
      status: 'archived',
      baseVersion: song.version,
      title: song.title,
      originalKey: song.originalKey,
      sections: song.sections,
      version: song.version,
      editedBy: auth.currentUser!.uid,
      createdAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    });

    // Apply draft
    tx.update(songRef, {
      title: edit.title,
      originalKey: edit.originalKey,
      sections: edit.sections,
      version: edit.version,
      updatedAt: serverTimestamp(),
    });

    tx.delete(editRef);
  });
  // Prune old archives (>10) via follow-up admin call or same transaction if small
}
```

---

## 4.4 Offline & listeners

### Persistence (once at init)

```typescript
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
```

### Listener policy

| Use case | Pattern |
|---|---|
| Song list | `getDocs` once + cache — **no** `onSnapshot` |
| Song detail | `getDocFromCache` → `getDoc` — **no** listener unless editing |
| Active session (band view) | **At most one** `onSnapshot` on session doc |

### localStorage fallback (R17)

```typescript
function useSongs() {
  const { user } = useAuth();
  if (!user) return { songs: getLocalSongs(), source: 'local' };
  return { songs: indexEntries, source: 'firestore' };
}
```

Presets in `presets.ts` always available regardless of auth.

---

## 4.5 Performance rules

See `docs/08-cost-budget.md` for read/write budgets.

- Pagination: `limit(20)` + `startAfter` for admin song browser only
- Batched writes: max 500 ops per batch
- Denormalize: `songTitle` in `sessionSongs`, `songCount` in `sessions`
- **Never** query `songs` collection for search — use `songIndex`

---

## 4.6 Service layer layout

```
src/lib/
├── firebase.ts
├── firestore/
│   ├── songs.ts
│   ├── songIndex.ts
│   ├── sessions.ts
│   ├── sessionSongs.ts
│   ├── songEdits.ts
│   └── users.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useSongSearch.ts
│   ├── useSong.ts
│   └── useSessions.ts
├── engine.ts          # unchanged
├── validation.ts      # unchanged
├── types.ts           # extended for Firestore fields
└── storage.ts         # fallback when !user (R17)
```

`firestore/` modules are pure SDK — no React. Copy to Flutter with syntax changes.
