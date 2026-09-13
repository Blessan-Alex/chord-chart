# Phase J — Firestore Security Rules

**Prerequisite:** Data model from Phase B, F, G  
**Outcome:** Strong permissions: admin-only song writes; user playlist/group ownership.

---

## Rules summary

### Songs (unchanged — strict)

```
songs/*     → read: auth + active
            → write: admin only
songIndex/* → read: auth
            → write: admin only
songEdits/* → admin only
```

### Playlists (`sessions/*`)

```
read:  auth && (
         resource.data.status == 'published'
         || resource.data.ownerId == request.auth.uid
         || request.auth.uid in resource.data.sharedWith
         || isAdmin()
       )

create: auth
        && request.resource.data.ownerId == request.auth.uid
        && request.resource.data.title is string
        && request.resource.data.date is timestamp

update: auth && (
          resource.data.ownerId == request.auth.uid
          || isAdmin()
        )

delete: auth && (
          resource.data.ownerId == request.auth.uid
          || isAdmin()
        )
```

### Session songs subcollection

```
read:  auth (same as parent read via get())
create/update/delete:
       playlist owner or admin
```

### Groups

```
read:  auth && request.auth.uid in resource.data.memberIds
create: auth && request.resource.data.ownerId == request.auth.uid
update: auth && (
          resource.data.ownerId == request.auth.uid
          || isAdmin()
        )
delete: owner or admin
```

### Users

```
read:  owner or admin (admin reads for invite lookup — use Cloud Function later OR limited query)
create: owner on signup with valid username fields
update: owner — only displayName, lastLoginAt (not role, not username v1)
```

---

## Tickets

### J-01 — Update rules file
**Files:** `firestore.rules`  
**Accept:** Deploys without syntax errors.

### J-02 — Playlist owner tests
**Files:** `rules.integration.test.ts`  
**Accept:** Owner CRUD pass; stranger fail.

### J-03 — Musician cannot write songs
**Files:** rules tests  
**Accept:** Musician create song denied.

### J-04 — Shared playlist read
**Files:** rules tests  
**Accept:** User in sharedWith can read not write.

### J-05 — Group member read
**Files:** rules tests  
**Accept:** Non-member denied.

### J-06 — Admin override tests
**Files:** rules tests  
**Accept:** Admin delete any playlist.

### J-07 — Validation helpers in rules
**Files:** `firestore.rules`  
**Do:** `validUsername`, `validPlaylistShape`.  
**Accept:** Bad shape rejected.

### J-08 — Document rules in ARCHITECTURE.md
**Files:** `docs/ARCHITECTURE.md`  
**Accept:** Permission matrix table updated.

---

## Phase J acceptance

- [ ] `npm run test:rules` passes
- [ ] Manual test: musician cannot delete song via console
- [ ] Manual test: musician can create own playlist
