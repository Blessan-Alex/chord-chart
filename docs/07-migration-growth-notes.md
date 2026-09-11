# Document 7 — Migration & Growth Notes

## 7.1 Bulk Song Import (CSV/JSON)

### Strategy

Create a Node.js script in `scripts/` that reads a CSV or JSON file and writes documents to Firestore using the Admin SDK (bypasses security rules).

### CSV Format

```csv
title,artist,originalKey,tempo,tags,ccli,copyright,chordpro
Good Good Father,Chris Tomlin,A,72,"worship|contemporary",7036612,© 2014 Capitol CMG,"[A]Oh, I've heard a [E/G#]thousand stories..."
```

### JSON Format

```json
[
  {
    "title": "Good Good Father",
    "artist": "Chris Tomlin",
    "originalKey": "A",
    "tempo": 72,
    "tags": ["worship", "contemporary"],
    "ccli": "7036612",
    "copyright": "© 2014 Capitol CMG",
    "sections": [...]
  }
]
```

### Import Script (`scripts/import-songs.ts`)

```typescript
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import songsData from './songs.json';

const app = initializeApp({ credential: cert('./serviceAccountKey.json') });
const db = getFirestore(app);

async function importSongs() {
  const batch = db.batch(); // max 500 per batch
  let count = 0;

  for (const song of songsData) {
    const ref = db.collection('songs').doc(); // auto-ID
    batch.set(ref, {
      ...song,
      titleLower: song.title.toLowerCase(),
      tags: song.tags ?? [],
      version: 1,
      createdBy: 'system-import',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    count++;

    // Commit every 400 to stay under 500 limit
    if (count % 400 === 0) {
      await batch.commit();
      console.log(`Committed ${count} songs...`);
    }
  }

  await batch.commit();
  console.log(`Done! Imported ${count} songs.`);
}

importSongs();
```

### ChordPro Conversion

If songs are provided in ChordPro format (`[Am]lyrics`), reuse the existing `L()` helper from `presets.ts` to parse into `{lyrics, chords}` format:

```typescript
// Reuse the L() parser from presets.ts
function parseChordProLine(input: string): LyricLine {
  const chords: ChordMark[] = [];
  let lyrics = '';
  let i = 0;
  while (i < input.length) {
    if (input[i] === '[') {
      const end = input.indexOf(']', i);
      if (end !== -1) {
        chords.push({ chord: input.slice(i + 1, end), position: lyrics.length });
        i = end + 1;
        continue;
      }
    }
    lyrics += input[i];
    i++;
  }
  return { lyrics, chords };
}
```

### Safety Checks

1. **Dry run first:** Add `--dry-run` flag that logs what would be written without committing
2. **Duplicate check:** Before writing, query by `titleLower` to skip existing songs
3. **Validation:** Validate each song against schema before writing (required fields, valid key)
4. **Backup:** Export existing collection before bulk import using `firebase firestore:export`
5. **Rate limiting:** Use batched writes (max 500 ops) to avoid quota issues

---

## 7.2 Schema Evolution Without Breaking Clients

### Principle: Additive-Only Changes

| Change Type | Safe? | Approach |
|---|---|---|
| Add new field to song | ✅ Yes | New field is optional; old clients ignore it |
| Rename field | ❌ No | Write both old and new field during migration period |
| Remove field | ⚠️ Careful | Keep field, mark as deprecated; remove after all clients updated |
| Change field type | ❌ No | Add new field with new type, migrate, then deprecate old |
| Add new collection | ✅ Yes | No impact on existing clients |
| Add field to existing subcollection | ✅ Yes | New field is optional |

### Example: Adding `capo` field to songs

```
Phase 1: Add capo field (optional, nullable)
  - Update types.ts: capo?: number | null
  - Update createSong(): include capo if provided
  - Old clients: unaware of capo, work fine

Phase 2: Update UI to show capo
  - Song detail shows capo if present
  - Editor allows setting capo

Phase 3: Backfill (optional)
  - Script sets capo: null on old songs (not required; Firestore handles missing fields gracefully)
```

### Version Flags

If a breaking change is truly necessary:

```json
{
  "schemaVersion": 2,
  "title": "...",
  ...
}
```

Client checks `schemaVersion` and handles accordingly. But this should be extremely rare — prefer additive changes.

### Client Compatibility

- **Web:** Ship new code instantly (Next.js deployment)
- **iOS/Android/Flutter:** Can't force instant updates. Must support `schemaVersion - 1` for 30+ days
- **Rule of thumb:** Any field a mobile client reads must remain available for 60 days after deprecation

---

## 7.3 Monitoring & Alerts

### What to Watch

| Metric | Where | Alert Threshold | Why |
|---|---|---|---|
| **Daily reads** | Firebase Console → Firestore Usage | > 40,000 (80% of Spark 50K limit) | Approaching free tier limit |
| **Daily writes** | Firebase Console → Firestore Usage | > 15,000 (75% of Spark 20K limit) | Unusual write volume |
| **Daily deletes** | Firebase Console → Firestore Usage | > 15,000 (75% of Spark 20K limit) | Unusual delete volume |
| **Rule denials** | Firebase Console → Firestore Rules | > 50/day | Possible auth bug or abuse |
| **Index usage** | Firebase Console → Firestore Indexes | Any "index required" error in logs | Missing composite index |
| **Auth failures** | Firebase Console → Authentication | > 20 failed logins/hour | Brute force attempt |
| **Latency** | Client-side logging (console.time) | Any query > 2s | Performance regression |
| **Bundle size** | `next build` output | JS bundle > 200KB gzipped | Bundle bloat |

### Setup Steps

1. **Firebase Console alerts:** Go to Firebase Console → Settings → Alerts → Enable usage alerts
2. **Client-side logging:** Add `console.time` / `console.timeEnd` around Firestore calls in development
3. **Error tracking:** Add error boundary reporting (existing `formatError.ts` + optional Sentry/LogRocket later)
4. **Firestore audit log:** Enable in Google Cloud Console → Firestore → Audit Logs (free tier may not include this)

### Dashboard

For Spark (free) tier, monitoring is limited to Firebase Console. If you upgrade to Blaze (pay-as-you-go):

- **Cloud Monitoring:** Set up alerts for Firestore read/write spikes
- **Cloud Logging:** View detailed rule evaluation logs
- **Performance Monitoring:** Firebase Performance SDK for client-side metrics

### Spark Tier Limits (Key Numbers)

| Resource | Daily Limit | Notes |
|---|---|---|
| Document reads | 50,000 / day | ~10 reads per song view (song + related data) → ~5,000 views/day |
| Document writes | 20,000 / day | Admin-only writes → rarely hit |
| Document deletes | 20,000 / day | Rarely hit |
| Storage | 1 GB total | 10,000 songs × 3 KB = 30 MB → well under limit |
| Network egress | 10 GB / month | Depends on usage; monitor |

### When to Upgrade to Blaze

- Band grows beyond ~20 active users viewing songs daily
- Song library exceeds 5,000 with frequent browsing
- Read count consistently above 30,000/day
- Need Cloud Functions for admin operations

---

## 7.4 Growth Roadmap (Post-Phase 5)

| Feature | Effort | Dependencies |
|---|---|---|
| **Personal playlists** | Small | New subcollection under `users/{uid}/playlists` |
| **Song suggestions** | Small | `suggestions` collection, any user can submit |
| **Setlist templates** | Medium | Copy session as template, clone for new dates |
| **PDF/image export** | Medium | Client-side PDF generation (jsPDF or html2canvas) |
| **CCLI reporting** | Medium | Track song usage per session, export report |
| **Mobile app (Flutter)** | Large | Same Firestore backend, new Flutter frontend |
| **Push notifications** | Medium | Cloud Functions + FCM for "new session published" |
| **Song arrangement variants** | Medium | New collection or subcollection for instrument-specific parts |
| **Audio/video links** | Small | Add `mediaUrls` field to songs |
| **Capo support** | Small | Add `capo` field, adjust transpose display |
| **Minor/modal keys** | Medium | Extend engine to handle Am, Em, etc. as keys |
| **Admin dashboard** | Large | Separate route `/admin` with user management, stats |
