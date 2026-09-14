# Sharing model — roles, privacy, and invite links

Plan for releasing LF Chords to churches globally. Goal: **private by default**, **one-tap share** (WhatsApp, etc.), **admin stays out of playlist management**.

---

## Roles (who does what)

| Role | Can do | Cannot do |
|------|--------|-----------|
| **Admin** (`token.admin`) | Add/edit/publish songs (lyrics, sections, chords, key, artist). Manage song library. | Create playlists for others, add people to groups, see private playlists |
| **Musician** (signed-in user) | Browse public song library. Create **own** playlists. Share playlists with people. Join groups. | Edit published songs (unless admin) |
| **Guest** | Browse/search songs, save locally on device | Playlists, groups, sharing |

**Admin job = database only.** Worship leaders and team leads own playlists and groups.

---

## What exists today

| Feature | How it works now | Gap |
|---------|------------------|-----|
| **Song library** | Public read (`songs/*`). Admin-only write. | OK for global catalog per deployment |
| **Playlists** | `sessions` doc: `createdBy`, `sharedWith[]`, `status` draft/published | Share by **typing @username** — slow, error-prone, not WhatsApp-friendly |
| **Groups** | 8-char `inviteCode`, join via code or owner invites by username | Code works but no **link**; manual copy/paste |
| **Playlist from group** | Group members see group playlists when published | OK |

Playlists are **not public**. Only owner, `sharedWith`, and (for published) group members can read. No global playlist listing for strangers.

---

## Target model (recommended)

### 1. Three layers of “who can see this”

```
Song library     →  Everyone (within this church’s Firebase project)
Playlist         →  Owner + explicitly shared members only
Group            →  Members only (+ their group playlists when published)
```

Each church runs **one Firebase project** (or one App Hosting site + Firestore). No cross-church data. “Global public” later = many church instances, not one shared social network.

### 2. Share via link (not username typing)

Replace “enter @username” as the primary flow with **invite links**:

| Resource | Link shape | On open |
|----------|------------|---------|
| **Playlist** | `https://lfchords.app/join/p/{token}` | If signed in → add uid to `sharedWith`, redirect to playlist. If not → login/signup → return → auto-join |
| **Group** | `https://lfchords.app/join/g/{inviteCode}` | Same pattern using existing `groupInviteCodes` |

**Token:** random 12+ char string stored on session doc (`shareToken`) or subcollection `sessionInvites/{token}`. Rules: only owner can create/revoke; `get` by token for join function.

**WhatsApp / social:** use Web Share API:

```ts
navigator.share({ title: playlist.title, url: joinUrl })
```

Fallback: **Copy link** button. No custom WhatsApp SDK needed — OS share sheet includes WhatsApp, Messages, email.

### 3. Join flow (signed out → signed in → auto-added)

```
User taps link
  → /join/p/[token] (or /join/g/[code])
  → Store pendingJoin in sessionStorage
  → If !auth → /login?next=/join/p/[token]
  → After auth → Cloud Function or client transaction:
       validate token, append uid to sharedWith / memberIds
  → Redirect to /playlists/[id] or /groups/[id]
```

Firestore rules stay strict: join must go through validated token/code, not open `update` on `sharedWith`.

### 4. Admin song editing (already built, polish path)

Admin flow today:

1. **Import** (`/import`) — paste lyrics → place chords → publish to library  
2. **Edit** (`/song/[id]/edit`) — draft → edit title, artist, key, sections, chords → publish  

Improvements to schedule (not all required for v1):

- Single “Edit song” entry from admin song view (not buried)
- Step 1 paste lyrics inside edit (re-parse sections) for major rewrites
- Clear **Draft / Publish / Discard** labels (edit page already has this)

Musicians never see edit unless admin.

---

## What NOT to do

- **Don’t make all playlists public** — breaks privacy between teams (youth band vs main service).
- **Don’t have admin assign people to playlists** — doesn’t scale; use share links.
- **Don’t require usernames before join** — username helps @-share fallback but link join should work with email/Google sign-in only.
- **Don’t expose playlist IDs in guessable URLs without token** — use unguessable token on join route.

---

## Implementation phases

### Phase A — UX quick wins (now)
- [x] Cleaner import / place-chords editor (contrast, mobile instructions, sticky save)
- [x] **Copy playlist link** button (owner only) on playlist detail
- [x] **Share sheet** (`navigator.share`) on playlist detail + share modal
- [x] **Invite by username** kept in share modal

### Phase B — Invite tokens (backend)
- [x] `shareToken` + `playlistInviteTokens` lookup on create
- [x] `/join/p/[token]` + login/signup `?next=` redirect
- [x] **Server join** via `POST /api/playlists/join` (Admin SDK — token required)
- [x] Firestore: token create requires playlist ownership; client cannot self-add to `sharedWith`
- [x] Regenerate invite link in share modal

### Phase B+ — Song sharing (public)
- [x] Share + copy on song page (`/song/{id}`, no sign-in required)
- [ ] Open Graph previews for social apps (later)

### Phase C — Group links
- [ ] `/join/g/[code]` wrapping existing `joinGroupByInviteCode`
- [ ] Share sheet on group page with full URL not just raw code

### Phase D — Per-church deployment
- [ ] Document: one Firebase project per church, admin claim via custom token
- [ ] Optional: church name in app shell via env `NEXT_PUBLIC_CHURCH_NAME`

---

## FAQ (your questions answered)

**“If every playlist is public, is that bad?”**  
Yes. Keep playlists private. Only the song **library** is public within a church instance.

**“Admin creates playlists and adds people?”**  
No. Admin only maintains songs. Worship leaders create playlists and share links.

**“Share to WhatsApp — click share, pick app?”**  
Yes. Web Share API opens the native sheet (WhatsApp, Telegram, etc.). Message contains one link; opening the link joins the playlist after sign-in.

**“People who click the link — auto-added?”**  
Yes, after sign-in, via token validation. Store `pendingJoin` through login redirect so they land in the playlist, not home.

**“Groups vs playlists?”**  
- **Group** = long-lived team (band). Join once via link/code.  
- **Playlist** = one set list (Sunday service). Share with group members or individuals via playlist link.  
A group can have many playlists; sharing a playlist doesn’t require joining a group.

---

## Security checklist

- [x] Join tokens unguessable (16 chars from secure alphabet)
- [x] Token `list` denied in Firestore rules (like `groupInviteCodes`)
- [ ] Expiring tokens optional (e.g. 7-day rehearsal links)
- [x] Owner can revoke token without deleting playlist (reset invite link)
- [ ] App Check enforced before public launch

---

## Server join API — is the service account safe on Vercel?

Playlist invite join uses `POST /api/playlists/join` with the Firebase **Admin SDK** on the server only.

**Yes, when configured correctly:**

| Do | Don't |
|----|-------|
| Set `FIREBASE_SERVICE_ACCOUNT_JSON` in Vercel **Environment Variables** (server) | Never use `NEXT_PUBLIC_` prefix |
| Never commit the JSON file to git | Never import `firebaseAdmin.ts` in client components |
| Restrict Vercel project access to trusted admins | Never log the full JSON |

The browser **never** receives this variable. Next.js API routes run on the server; only the route response (e.g. `{ sessionId }`) goes to the client. Our code only imports `firebaseAdmin` from the API route — verified, not in any `"use client"` file.

**Alternative (no secret on Vercel):** deploy a **Firebase Cloud Function** `acceptPlaylistInvite(token)` and call it from the app. Credentials stay in Google Cloud only. Same security, one extra deploy step.
