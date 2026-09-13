# Document 8 — Cost Budget (Spark / Free Tier)

> **Goal:** Stay under Firebase Spark limits with ~20 musicians on a Sunday morning. All design choices in `docs/02`–`05` assume this budget.

---

## Spark limits (daily)

| Resource | Limit | Our target (80%) |
|---|---|---|
| Document reads | 50,000 | 40,000 |
| Document writes | 20,000 | 16,000 |
| Document deletes | 20,000 | 16,000 |
| Storage | 1 GB | — |
| Egress | 10 GB/month | — |

**No Cloud Functions on Spark.** Admin scripts use Firebase Admin SDK locally with `GOOGLE_APPLICATION_CREDENTIALS` — not runtime Functions.

---

## Reads per user action

| Action | Reads | Notes |
|---|---|---|
| **Home load (signed in)** | 1–5 | Fetch `songIndex/chunk0` … `chunkN` once per session; cache in memory + IndexedDB |
| **Search keystroke** | **0** | Filter cached index locally (`useSongSearch`) |
| **Song detail** | 0–1 | `getDocFromCache` first; 1 server read on cache miss |
| **Session list** | 1–10 | `getDocs` sessions query (paginated, `limit(10)`) |
| **Session detail** | 1 + N | 1 session doc + N `sessionSongs` subdocs; prefetch song docs = +N (optional, user-triggered "Cache offline") |
| **Publish draft** | 3–5 | Transaction reads song + draft + writes archive |
| **Add song to session** | 2–3 | Transaction: session + new subdoc + count update |
| **Profile / auth** | 0 | `request.auth.token.admin` — no Firestore read for role |

---

## Writes per user action

| Action | Writes | Notes |
|---|---|---|
| **Import song (admin)** | 1 + index update | Song doc + patch one `songIndex` chunk (batched) |
| **Edit publish** | 3–4 | Transaction: archive + song update + draft delete |
| **Add to session** | 2 | Subdoc create + session `songCount` |
| **Reorder one song** | 1 | Fractional `order` — single doc update |
| **Soft-delete song** | 1 | `status: "archived"` — no delete |
| **Self-signup** | 1 | `users/{uid}` create |

---

## Rules (non-negotiable on Spark)

1. **No `onSnapshot` on collection queries** — list pages use `getDocs` + cache; at most **one** listener on active session detail if needed.
2. **Library index = 1–5 reads total** per app session, not per search.
3. **`getDocFromCache` → server** for song detail (offline-first).
4. **Ban prefix search queries** — substring match on cached `songIndex` only.
5. **Fractional ordering** for session reorder — never rewrite N docs for one drag.

---

## Dev-mode read counter (implement later)

```typescript
// src/lib/firestore/readCounter.ts — dev only
let reads = 0;
export function trackRead(n = 1) { if (process.env.NODE_ENV === 'development') reads += n; }
export function getReadCount() { return reads; }
export function resetReadCount() { reads = 0; }
```

Wrap `getDoc` / `getDocs` in firestore modules during development. Log summary on route change. **Target:** home load ≤ 5 reads, search keystroke = 0.

---

## Sunday morning scenario (20 users)

| Assumption | Value |
|---|---|
| Active musicians | 20 |
| Songs in library | 500 (indexed in 1–2 chunks) |
| Each opens app once | 20 × 3 reads (index) = **60 reads** |
| Each views 5 songs | 20 × 5 × 1 read = **100 reads** (mostly cache after first) |
| 2 admins publish edits | 2 × 4 writes = **8 writes** |
| 1 admin builds session (8 songs) | ~10 writes |

**Estimated total:** ~200–500 reads, ~20 writes — **well under Spark limits**.

At 10,000 songs (~5 index chunks): first load = 5 reads/user → 100 reads for 20 users. Still safe.

---

## When to upgrade to Blaze

- Consistently > 35,000 reads/day
- Need scheduled backups (or use manual `export-songs.ts` weekly — see `docs/07`)
- Need Cloud Functions (not required for v1)

See `docs/07` §7.3 for monitoring setup (Firebase Console alerts).
