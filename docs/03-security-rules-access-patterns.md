# Document 3 — Security Rules & Access Patterns (BaaS-Ready)

## 3.1 Access Control Summary

| Collection | Read | Write (Create) | Write (Update) | Delete |
|---|---|---|---|---|
| `songs` | Any authenticated user | Admin only | Admin only | Admin only |
| `songEdits` | Admin only | Admin only | Admin only | Admin only |
| `sessions` | Any authenticated user | Admin only | Admin only | Admin only |
| `sessions/{id}/sessionSongs` | Any authenticated user | Admin only | Admin only | Admin only |
| `users` | Own document only | System (on signup) | Own document (limited fields) | Never |
| `meta` | Any authenticated user | Admin only | Admin only | Never |

> **Key principle:** Musicians can READ everything except drafts. Only admins can WRITE. This is simple to enforce and audit.

---

## 3.2 Helper Functions

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ─── Helper: Is the user authenticated? ───
    function isAuth() {
      return request.auth != null;
    }

    // ─── Helper: Get the user's role from their profile doc ───
    function userRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    // ─── Helper: Is the user an admin? ───
    function isAdmin() {
      return isAuth() && userRole() == 'admin';
    }

    // ─── Helper: Is the user the document owner? ───
    function isOwner(uid) {
      return isAuth() && request.auth.uid == uid;
    }
```

> **Performance note:** `userRole()` performs a Firestore read on every write rule evaluation. This is acceptable because writes are infrequent (admin-only, ~5-10 songs/week). For reads, we only check `isAuth()` which is free.

---

## 3.3 Rule Snippets by Collection

### `songs` — Public read (authenticated), admin write

```javascript
    // ─── Songs ───
    match /songs/{songId} {
      // Any authenticated user can read published songs
      allow read: if isAuth();

      // Only admins can create, update, or delete songs
      allow create: if isAdmin()
        && request.resource.data.title is string
        && request.resource.data.originalKey is string
        && request.resource.data.sections is list;

      allow update: if isAdmin()
        && request.resource.data.title is string
        && request.resource.data.version == resource.data.version + 1;

      allow delete: if isAdmin();
    }
```

### `songEdits` — Admin only (drafts are private)

```javascript
    // ─── Song Edits (Drafts & Versions) ───
    match /songEdits/{editId} {
      // Only admins can see drafts and version history
      allow read: if isAdmin();

      // Only admins can create/modify/delete edits
      allow create: if isAdmin()
        && request.resource.data.songId is string
        && request.resource.data.status in ['draft', 'archived'];

      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
```

### `sessions` — Public read, admin write

```javascript
    // ─── Sessions ───
    match /sessions/{sessionId} {
      // Any authenticated user can read sessions
      allow read: if isAuth();

      // Only admins can create/modify sessions
      allow create: if isAdmin()
        && request.resource.data.serviceType in ['friday', 'sunday_morning', 'sunday_evening']
        && request.resource.data.date is timestamp;

      allow update: if isAdmin();
      allow delete: if isAdmin();

      // ─── Session Songs (subcollection) ───
      match /sessionSongs/{songEntryId} {
        allow read: if isAuth();
        allow create: if isAdmin()
          && request.resource.data.songId is string
          && request.resource.data.order is number;
        allow update: if isAdmin();
        allow delete: if isAdmin();
      }
    }
```

### `users` — Own profile only

```javascript
    // ─── Users ───
    match /users/{uid} {
      // Users can read their own profile
      allow read: if isOwner(uid);

      // Users can update their own displayName and lastLoginAt only
      allow update: if isOwner(uid)
        && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['displayName', 'lastLoginAt']);

      // Profile creation is handled by Cloud Function or admin SDK
      // No client-side create or delete
      allow create: if false;
      allow delete: if false;
    }
```

### `meta` — Read-only for clients

```javascript
    // ─── Meta ───
    match /meta/{docId} {
      allow read: if isAuth();
      allow write: if false; // Updated by Cloud Functions only
    }

  } // end documents
} // end service
```

---

## 3.4 Full Rules File (Combined)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }

    function userRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return isAuth() && userRole() == 'admin';
    }

    function isOwner(uid) {
      return isAuth() && request.auth.uid == uid;
    }

    // Songs
    match /songs/{songId} {
      allow read: if isAuth();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Song Edits
    match /songEdits/{editId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }

    // Sessions + subcollection
    match /sessions/{sessionId} {
      allow read: if isAuth();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();

      match /sessionSongs/{entryId} {
        allow read: if isAuth();
        allow write: if isAdmin();
      }
    }

    // Users
    match /users/{uid} {
      allow read: if isOwner(uid);
      allow update: if isOwner(uid)
        && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['displayName', 'lastLoginAt']);
      allow create, delete: if false;
    }

    // Meta
    match /meta/{docId} {
      allow read: if isAuth();
      allow write: if false;
    }
  }
}
```

---

## 3.5 Access Pattern Summary

```
                    ┌─────────────┐
                    │  Firebase    │
                    │  Auth       │
                    └──────┬──────┘
                           │ JWT token
                    ┌──────▼──────┐
                    │  Firestore  │
                    │  Rules      │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │   Admin     │ │  Musician   │ │  Anon       │
    │             │ │             │ │             │
    │ Read: all   │ │ Read: songs │ │ Read: none  │
    │ Write: all  │ │   sessions  │ │ Write: none │
    │             │ │ Write: own  │ │             │
    │             │ │   profile   │ │             │
    └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 3.6 Future-Proofing Notes

1. **Adding musician write permissions:** If musicians need to create personal playlists (not sessions), add a `personalPlaylists` subcollection under `users/{uid}` — no rule changes to shared collections needed.

2. **Granular admin roles:** If needed (e.g., "editor" vs "super-admin"), change `role` from a string to an array or add a `permissions` map in the user doc. Rules would check `userRole() in ['admin', 'editor']`.

3. **Public (unauthenticated) access:** To allow public song viewing later, change `songs` read rule from `isAuth()` to `true`. All other collections remain authenticated.

4. **Rate limiting:** Firestore doesn't have built-in rate limiting in rules, but you can add App Check for abuse prevention and use Cloud Functions for sensitive operations.
