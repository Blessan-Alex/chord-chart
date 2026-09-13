# Document 3 — Security Rules & Access Patterns (Spark-Ready)

> **Canonical rules:** [`../../firestore.rules`](../../firestore.rules) at the repo root. This doc summarizes intent — if anything disagrees, the rules file wins.

> **Spark tier:** No Cloud Functions. Admin checks use **custom claims** (`request.auth.token.admin`). User profiles are **self-created** on signup. `meta` is seed-only via Admin SDK.

---

## 3.1 Access Control Summary

| Collection | Read | Write (Create) | Write (Update) | Delete |
|---|---|---|---|---|
| `songs` | **Public** — active songs only (`status == 'active'`) | Admin (custom claim) | Admin | Admin |
| `songIndex` | **Public** — all chunks | Admin | Admin | Admin |
| `songEdits` | Admin | Admin | Admin | Admin |
| `sessions` | Auth — published, owned, shared, group member, or admin | Auth — owner creates own playlist | Auth — owner or admin | Auth — owner or admin |
| `sessions/{id}/sessionSongs` | Auth — same visibility as parent playlist | Auth — playlist owner or admin | Auth — playlist owner or admin | Auth — playlist owner or admin |
| `groups` | Auth — group member or admin | Auth — creator becomes owner | Auth — owner, join-by-code, or admin | Auth — owner or admin |
| `groupInviteCodes` | Auth — **get by exact code only** (list denied) | Auth — group owner on create | Auth — owner | Auth — owner |
| `users` | Own document only | Self (signup) | Own (`displayName`, `lastLoginAt`, `avatarInitials`; role immutable) | Never |
| `usernames` | **Public get** (availability check); list denied | Auth — reserve own username | Never | Never |
| `meta` | Auth | Never (client) | Never (client) | Never |

**Open library:** Guests can browse/search active songs and read the song index without signing in. Playlists, groups, drafts, and admin tools require auth (and admin claim where noted).

**Admin promotion:** Run `webmvp/scripts/set-admin.ts` with Admin SDK to set `admin: true` on a user's Auth record. Do **not** rely on `users.role` in rules — `role` is display/metadata only and cannot be escalated client-side.

---

## 3.2 Helper Functions (summary)

See `firestore.rules` for the full set. Key helpers:

- `isAdmin()` — `request.auth.token.admin == true` (custom claim, zero Firestore reads)
- `validSongShape()` — title, key, sections list, status on song writes
- `canReadPlaylist(sessionId)` — published / owner / shared / group member / admin
- `isGroupJoinUpdate()` — validates single-member join without changing owner/name/invite code

---

## 3.3 Canonical `firestore.rules`

**Do not duplicate the rules in docs.** Edit only:

```
../../firestore.rules
```

Deploy from repo root:

```bash
npx firebase-tools deploy --only firestore:rules --project <project-id>
```

Integration tests (emulator): `cd webmvp && npm run test:integration`

---

## 3.4 App Check

Client init: `webmvp/src/lib/firebase.ts` → `initAppCheck()` (reCAPTCHA Enterprise).

**Enforcement is a console step**, not a rules change. See [`ops-app-check-enforce.md`](ops-app-check-enforce.md).

1. Set `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY` in `.env.local` / Vercel
2. Firebase Console → App Check → register web app (reCAPTCHA Enterprise)
3. Firebase Console → Firestore → App Check → **Enforced**
4. Smoke test sign-in, home library, song open, admin import

App Check rejects unverified clients **before** rules run. Spark tier: free.

---

## 3.5 Admin setup (`webmvp/scripts/set-admin.ts`)

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json npm run set-admin user@example.com
```

User must sign out and back in for the claim to apply.

Never commit service account JSON.

---

## 3.6 Access pattern diagram

```
Firebase Auth (JWT + custom claims)
        │
        ▼
App Check (optional enforce — blocks bots before rules)
        │
        ▼
firestore.rules
        │
   ┌────┴────────────────┐
   │                     │
 Admin (claim)      Musician / Guest
   │                     │
 Write songs,       Guest: read active songs + index
 index, edits       Auth: playlists, groups, profile
 Read all           Write: own playlists, join groups
```

---

## 3.7 Query cost notes

| Surface | Pattern | Reads (typical) |
|---|---|---|
| Home library (all users) | 5 × `songIndex` chunk docs | 5 (cached after first load) |
| Playlists page | owned + shared + published (`limit 100`) | bounded, not full catalog scan |
| Admin stats | index length + `getCountFromServer` × 2 | ~7 |
| Song page | 1 × `songs/{id}` | 1 |

See [`08-cost-budget.md`](08-cost-budget.md) for Spark tier limits.

---

## 3.8 Future-proofing

1. **Editor role:** Add `editor` custom claim; extend song write rules without full admin.
2. **Index beyond 10k:** Add `chunk5` to `SONG_INDEX_CHUNK_IDS` in `songIndex.ts` (capacity is `chunks × 2000`).
3. **Rate limiting:** App Check enforce + Firebase usage alerts.
