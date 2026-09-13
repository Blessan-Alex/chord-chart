# Phase F — Playlists (Sessions Rename + User CRUD)

**Prerequisite:** Phase B (username), Phase C (home previews)  
**Outcome:** Any authenticated user creates/manages playlists; UI matches mockups; admin publish optional.

---

## Policy

| Action | Who |
|--------|-----|
| Create playlist | Any authenticated user |
| Edit own playlist (title, date, songs, keys) | Owner |
| Edit shared playlist | Users in `sharedWith` with edit flag (v1: owner only) |
| View published playlist | All authenticated users |
| Delete playlist | Owner; admin can delete any |
| Publish to band-wide library | Admin only (optional `status: published`) |

---

## Tickets

### F-01 — UI rename Sessions → Playlists
**Files:** All UI strings, `AppShell`, routes  
**Do:** Label only; routes `/playlists` with redirect from `/sessions`.  
**Accept:** No "Session" in user-facing text.

### F-02 — Route migration
**Files:** `app/playlists/**` copy from `app/sessions/**`; redirects in `next.config.ts`  
**Accept:** `/sessions` → 308 → `/playlists`.

### F-03 — Playlist list UI
**Files:** `app/playlists/page.tsx`, `PlaylistCard.tsx`  
**Do:** Match `playlist.png`: cards with preview grid, + button.  
**Accept:** Visual match.

### F-04 — User create playlist
**Files:** `firestore/sessions.ts`, `playlists/new/page.tsx`  
**Do:** Remove admin gate; set `ownerId`, `ownerUsername`.  
**Accept:** Musician can create playlist.

### F-05 — Playlist list query
**Files:** `sessions.ts`  
**Do:** `listPlaylistsForUser(uid)` — owned + shared + published.  
**Accept:** Home previews populate.

### F-06 — Playlist detail UI
**Files:** `playlists/[id]/page.tsx`  
**Do:** Match `playlist2.png`: numbered rows, key badge, Add songs dashed button.  
**Accept:** Start set ▶ preserved.

### F-07 — Edit playlist mode
**Files:** playlist detail  
**Do:** Edit link toggles reorder/delete/key override (owner only).  
**Accept:** Non-owner sees read-only list.

### F-08 — Share playlist modal
**Files:** `SharePlaylistModal.tsx`  
**Do:** Invite by @username; adds uid to `sharedWith`.  
**Accept:** Invited user sees playlist in list.

### F-09 — Key override UI restyle
**Files:** playlist detail rows  
**Do:** Key badge opens Key modal (from Phase D).  
**Accept:** Override persists to Firestore.

### F-10 — Offline cache button restyle
**Files:** playlist detail  
**Do:** Icon button matching design system; keep `cacheSessionOffline`.  
**Accept:** Still works offline.

### F-11 — Add to playlist modal restyle
**Files:** `AddToSessionModal.tsx` → `AddToPlaylistModal.tsx`  
**Accept:** Works from song view.

### F-12 — Remove service type from UI
**Files:** new playlist form  
**Do:** Title + date only (already done); hide serviceType in display.  
**Accept:** No Friday/Sunday labels.

### F-13 — Firestore rules update
**Files:** `firestore.rules`  
**Do:** See `phase-j-security-rules.md` F-rules section.  
**Accept:** Emulator tests pass.

### F-14 — (Optional) Collection alias
**Files:** docs only unless migrating  
**Do:** Document `sessions` → `playlists` rename as future breaking change.  
**Accept:** Deferred unless needed.

---

## Phase F acceptance

- [ ] Musician creates playlist, adds songs, sets keys
- [ ] Share by @username works
- [ ] UI says Playlist everywhere
- [ ] Song nav `?playlist=&index=` works
- [ ] Admin publish still works for band-wide lists
