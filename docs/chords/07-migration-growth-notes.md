# Document 7 — Migration & Growth Notes

## 7.1 Bulk Song Import (Admin SDK)

### Credentials — NEVER commit keys

```bash
# Service account JSON lives OUTSIDE the repo
export GOOGLE_APPLICATION_CREDENTIALS="/path/outside/repo/lf-chordapp-admin.json"
npx tsx scripts/import-songs.ts
```

Root `.gitignore` blocks:
- `serviceAccountKey.json`
- `**/serviceAccount*.json`
- `*-serviceaccount*.json`

**Do not** place `./serviceAccountKey.json` inside `scripts/`. Use `GOOGLE_APPLICATION_CREDENTIALS` only.

### Import script pattern

```typescript
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
  credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS!),
});
const db = getFirestore(app);
```

### ChordPro parsing

Use the existing `L()` helper from `presets.ts` — **not** `parseRawLyrics`:

```typescript
import { L } from '../src/data/presets'; // or extract L() to shared module

// "[Am]Amazing grace" → { lyrics, chords: [{ chord, position }] }
const line = L('[Am]Amazing grace');
```

`parseRawLyrics` is for user-pasted plain lyrics on `/import` only.

### Safety checks

1. `--dry-run` flag logs without writing
2. Validate each song with `validateSong()` before write
3. Update `songIndex` chunks in same batch as song writes
4. Batched writes (max 400 per batch)

---

## 7.2 Schema evolution

Additive-only changes. See original compatibility table — unchanged principle.

`schemaVersion` in `meta/stats` for rare breaking changes.

---

## 7.3 Monitoring & quotas

**Do not rely on optimistic quota math here.** See **`docs/08-cost-budget.md`** for:
- Per-action read/write counts
- Spark limits and Sunday-morning scenario
- Dev read counter spec
- When to upgrade to Blaze

### Firebase Console alerts

Enable usage alerts at 80% of Spark daily limits (reads, writes).

### Client logging (dev only)

Wrap firestore calls with `readCounter` — see `docs/08-cost-budget.md`.

---

## 7.4 Manual backup (`export-songs.ts`) — Ticket P2-10

Weekly manual export — no Blaze scheduled export required:

```bash
GOOGLE_APPLICATION_CREDENTIALS=... npx tsx scripts/export-songs.ts > backup-2026-09-11.json
```

Exports all `songs` where `status == 'active'`. Store backup outside repo.

---

## 7.5 Growth roadmap (post-Phase 5)

| Feature | Effort | Notes |
|---|---|---|
| Personal playlists | Small | `users/{uid}/playlists` subcollection |
| PDF export | Medium | Client-side jsPDF |
| CCLI reporting | Medium | Session usage tracking |
| Flutter app | Large | Same Firestore + engine port |
| Push notifications | Medium | Requires Blaze + Cloud Functions |
| Capo support | Small | Extend engine + UI |

Cloud Functions only needed for push, scheduled jobs, and server-side triggers — not required for v1 on Spark.
