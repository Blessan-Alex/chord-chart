# Document 3 — Security Rules & Access Patterns (Spark-Ready)

> **Spark tier:** No Cloud Functions. Admin checks use **custom claims** (`request.auth.token.admin`). User profiles are **self-created** on signup. `meta` is seed-only via Admin SDK.

---

## 3.1 Access Control Summary

| Collection | Read | Write (Create) | Write (Update) | Delete |
|---|---|---|---|---|
| `songs` | Authenticated (`status == 'active'`) | Admin (custom claim) | Admin | Admin (soft-archive preferred) |
| `songIndex` | Authenticated | Admin SDK only | Admin SDK only | Never |
| `songEdits` | Admin | Admin | Admin | Admin |
| `sessions` | Authenticated | Admin | Admin | Admin |
| `sessions/{id}/sessionSongs` | Authenticated | Admin | Admin | Admin |
| `users` | Own document only | Self (signup) | Own (`displayName`, `lastLoginAt` only) | Never |
| `meta` | Authenticated | Never (client) | Never (client) | Never |

**Session sharing:** Sessions require authentication. Share links use normal app routes (`/sessions/[id]`); no public token URLs in v1. (Future: optional read-only token doc if needed.)

---

## 3.2 Helper Functions

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }

    // Custom claim — zero Firestore reads (R1, R2)
    function isAdmin() {
      return isAuth() && request.auth.token.admin == true;
    }

    function isOwner(uid) {
      return isAuth() && request.auth.uid == uid;
    }

    function validKey(k) {
      return k in ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    }

    function validSongShape() {
      return request.resource.data.title is string
        && request.resource.data.originalKey is string
        && validKey(request.resource.data.originalKey)
        && request.resource.data.sections is list
        && request.resource.data.status in ['active', 'archived'];
    }
```

> **Admin promotion:** Run `scripts/set-admin.ts` locally with Admin SDK to set `admin: true` custom claim on a user's Auth record. Do **not** rely on `users.role == 'admin'` in rules — `role` is display/metadata only.

---

## 3.3 Canonical `firestore.rules`

Single source of truth. Delete any duplicate snippets elsewhere.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuth() && request.auth.token.admin == true;
    }

    function isOwner(uid) {
      return isAuth() && request.auth.uid == uid;
    }

    function validKey(k) {
      return k in ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    }

    function validSongShape() {
      return request.resource.data.title is string
        && request.resource.data.originalKey is string
        && validKey(request.resource.data.originalKey)
        && request.resource.data.sections is list
        && request.resource.data.status in ['active', 'archived'];
    }

    // ─── Songs ───
    match /songs/{songId} {
      allow read: if isAuth()
        && resource.data.status == 'active';

      allow create: if isAdmin() && validSongShape();

      // Shape validation only — version managed in publishDraft transaction (R6)
      allow update: if isAdmin() && validSongShape();

      allow delete: if isAdmin();
    }

    // ─── Library index (read-only for clients) ───
    match /songIndex/{chunkId} {
      allow read: if isAuth();
      allow write: if false; // Admin SDK seed/rebuild only
    }

    // ─── Song edits (drafts) ───
    match /songEdits/{editId} {
      allow read: if isAdmin();
      allow create: if isAdmin()
        && request.resource.data.songId is string
        && request.resource.data.status in ['draft', 'archived']
        && request.resource.data.baseVersion is int;
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // ─── Sessions ───
    match /sessions/{sessionId} {
      allow read: if isAuth();
      allow create: if isAdmin()
        && request.resource.data.serviceType in ['friday', 'sunday_morning', 'sunday_evening']
        && request.resource.data.date is timestamp;
      allow update: if isAdmin();
      allow delete: if isAdmin();

      match /sessionSongs/{entryId} {
        allow read: if isAuth();
        allow create: if isAdmin()
          && request.resource.data.songId is string
          && request.resource.data.order is number;
        allow update: if isAdmin();
        allow delete: if isAdmin();
      }
    }

    // ─── Users (self-signup on Spark — R1) ───
    match /users/{uid} {
      allow read: if isOwner(uid);

      allow create: if isOwner(uid)
        && request.resource.data.email is string
        && request.resource.data.displayName is string
        && request.resource.data.role == 'musician';

      allow update: if isOwner(uid)
        && request.resource.data.role == resource.data.role  // role immutable
        && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['displayName', 'lastLoginAt']);

      allow delete: if false;
    }

    // ─── Meta (seed via Admin SDK at deploy — R1) ───
    match /meta/{docId} {
      allow read: if isAuth();
      allow write: if false;
    }
  }
}
```

---

## 3.4 App Check (R11)

Enable before public launch:

1. Firebase Console → App Check → Register web app with **reCAPTCHA v3**.
2. Add App Check provider to `src/lib/firebase.ts`.
3. Firebase Console → Firestore → Enforce App Check.
4. Rules automatically reject requests without valid App Check token.

App Check is free and prevents quota abuse from scripted reads.

---

## 3.5 Admin setup (`scripts/set-admin.ts`)

```typescript
// Run locally: GOOGLE_APPLICATION_CREDENTIALS=/path/outside/repo.json npx tsx scripts/set-admin.ts uid@email.com
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const app = initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS!) });
await getAuth(app).setCustomUserClaims(uid, { admin: true });
```

Never commit service account JSON. See `docs/07` §7.1.

---

## 3.6 Access pattern diagram

```
Firebase Auth (JWT + custom claims)
        │
        ▼
firestore.rules
        │
   ┌────┴────┐
   │         │
 Admin     Musician
 (claim)   (authed)
   │         │
 Read/     Read songs,
 Write     sessions, index
 all       Write: own profile only
```

---

## 3.7 Future-proofing

1. **Editor role:** Add `editor` custom claim; extend `isAdmin()` OR check `request.auth.token.editor == true` for song writes only.
2. **Public read:** Change `songs` read to `resource.data.status == 'active'` without `isAuth()` if needed — keep drafts/edits admin-only.
3. **Rate limiting:** App Check + Firebase Console usage alerts (see `docs/08-cost-budget.md`).
