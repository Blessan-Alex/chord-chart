# Flutter Phase 5 — Playlists (sessions), set songs, share & join API

**Parent:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 5  
**Parity specs:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.6, data §4.5–4.7, API §6.1, routes §2.1  
**Roadmap alignment:** Matrix §3 — `listPlaylistsForUser`, create, reorder, key override, publish display, invite link + join (P0); share-by-username (v1.1 / P1 defer)  
**Depends on:** [Phase 1](flutter-phase-1-auth.md) (auth, username, `go_router` guards), [Phase 2](flutter-phase-2-library.md) (index for add-song search), [Phase 3](flutter-phase-3-song-chart.md) (song screen, `getSession` / `listSessionSongs` read paths), [Phase 4](flutter-phase-4-performance.md) (`startSetHref`, performance context — optional for CRUD)  
**Backend:** Firestore `sessions`, `sessionSongs`, `playlistInviteTokens`; **HTTPS** `POST {JOIN_API_BASE_URL}/api/playlists/join` (same as web — invitees **cannot** `arrayUnion` themselves onto `sharedWith`; only the join API / owner username share can)

**Auth (rules + product):** **All** `sessions` reads require **signed-in** user (`firestore.rules` — including `status == 'published'`). Playlists are not guest-accessible on web (`SignInRequired`). `/playlists/*` lives behind **UsernameGate** on web (`(app)/layout`); `/join/p/:token` is **auth only** (no username gate until after join).

**Goal:** Musicians can **list, create, edit, share, and join** playlists (Firestore `sessions`) with the same rules and queries as web — **no admin authoring**, no guest playlist access. Invite links use the **Vercel join API** with Firebase ID token.

**Estimate:** 2.5–3 person-weeks (1 FTE)

---

## 1. Scope summary

### In scope (Phase 5)

| Area | Web reference | Flutter deliverable |
|------|---------------|---------------------|
| Auth gate | `SignInRequired` on playlist routes | `go_router` redirect to `/login?next=` for `/playlists/*`, `/join/p/:token` |
| List playlists | `listPlaylistsForUser`, `playlists/page.tsx` | `/playlists` — merge queries, local title search, sections (owned drafts, shared drafts, published) |
| Create playlist | `createSession`, `playlists/new` | `/playlists/new` — title + date; `serviceType: sunday_morning` default (match web form) |
| Playlist detail | `playlists/[id]/page.tsx` | Load session, `canViewPlaylist`, live `sessionSongs` stream |
| Add songs | `useSessionSongsLive.addSongOptimistic`, index search | Add panel with same search/rank as home (reuse Phase 2 providers) |
| Remove songs | `removeSongFromSession` | Confirm dialog |
| Reorder | `moveSessionSongUp` / `Down`, `reorderSessionSong` | Edit mode + up/down (mid `order` values, `ORDER_STEP` 1000) |
| Key override | `updateSessionSongKeyOverride` | Per-row key modal; flows to `?key=` via `sessionSongHref` |
| Publish | `updateSessionStatus('published')` | Owner confirm dialog + `playlistLabels` copy |
| Publish display | `playlistVisibilityLabel`, status badges | Read-only badges (not admin publish tooling) |
| Delete | `deleteSession` | Owner confirm; cascade songs + invite token doc |
| Invite token | `ensurePlaylistInviteToken`, `createPlaylistInviteToken` | Owner-only; store `shareToken` on session |
| Regenerate link | `regeneratePlaylistInviteToken` | Share modal — invalidates old token |
| Share invite link | `sharePlaylist.ts`, `SharePlaylistModal` | `share_plus` + copy URL; `playlistInviteUrl` with app/web base |
| Join via link | `join/p/[token]`, `joinPlaylistByInviteToken` | Route `/join/p/:token` → `JoinApiClient` → `/playlists/:id` |
| Join API client | `playlistInvites.ts` + `route.ts` | `http` POST + Bearer `getIdToken()`; map 401/400/404/500 |
| Deep links | Roadmap §5 | `https://lfchords.vercel.app/join/p/{token}` + custom scheme fallback |
| Add to playlist | `AddToPlaylistModal` on song page | Signed-in only; `listOwnedPlaylists` + `addSongToSession` |
| Start set / play | `startSetHref` | Primary CTA on detail → `/song/:id?playlist=&index=0` |
| Members UI | `playlistMembers.ts`, `MemberPills` | `buildPlaylistMemberList`, access count/label |
| Display helpers | `sessionDisplay.ts`, `playlistLabels.ts` | Date format, tile gradient, publish confirm message |
| Access helpers | `getPlaylistOwnerId`, `isPlaylistOwner`, `canViewPlaylist` | Port to `session_repository.dart` or domain |
| Home “My playlists” | `HomePage` owned slice | **P1:** up to 2 owned playlists + preview lines (3 songs) when signed in |
| Shell nav | Web sidebar | Bottom/side nav tab → `/playlists` (Phase 1 shell) |
| Song row → chart | `sessionSongHref(sessionId, entry, index)` | Tap set list row → `/song/:id?playlist=&index=&key?` (Phase 3/4 performance context) |
| Owner quick share | `handleQuickShare` on detail | One-tap `share_plus` invite (owner, token ready) — separate from full share sheet |
| Share sheet (link) | `SharePlaylistModal` | Link share, URL preview, reset invite link (**hide** “add by username” form until v1.1 — web shows both) |
| List empty / cap UX | `playlists/page.tsx` | Public section empty CTA; banner when `published.length >= PUBLISHED_PLAYLIST_CAP` |
| Refactor reads | Phase 3 song `getSession` | Consolidate on `SessionRepository` / `SessionSongsRepository` (single source for song + playlist screens) |

### Out of scope (Phase 5)

| Item | Phase / note |
|------|----------------|
| Offline prefetch `cacheSessionOffline` | **6** |
| Connectivity banner | **6** |
| Groups list, group playlists on home, `listPlaylistsForGroup` UI | **7** (`groupId` on create deferred unless product needs v1) |
| `sharePlaylistByUsername` | **v1.1** (roadmap matrix); owner can use invite link in v1 |
| `sessionSongs.notes` edit UI | Web stores `notes: null` only — **no UI**; skip until web adds |
| Admin-only flows (`isAdmin` bypass) | **Ignore admin claim** in UI — `canEdit` / `canView` use **`isOwner` only** (web: `canEdit = isOwner \|\| isAdmin`) |
| TanStack Query | Use Riverpod + Firestore `snapshots()` |
| Guest playlist read | **Never** — rules require `isAuth()` for every session read |
| Group playlist read via `groupId` + `isGroupMember` | Rules allow; **UI** for group playlists is Phase **7** (detail may 403 until shared/owner/published) |

### Mobile vs web (intentional)

| Topic | Web | Flutter Phase 5 |
|-------|-----|------------------|
| Join API URL | Relative `/api/playlists/join` | Absolute `{JOIN_API_BASE_URL}/api/playlists/join` (`--dart-define`) |
| Share origin | `window.location.origin` | `JOIN_API_BASE_URL` or dedicated `SHARE_WEB_ORIGIN` (default prod Vercel) |
| Playlist home | `/` sections | `/home` sections (P1) |
| Native share | `navigator.share` | `share_plus` |
| Create `serviceType` | Hidden default `sunday_morning` | Same default; **P1** service type picker |

---

## 2. Web behavior checklist (must match)

Sources: `firestore/sessions.ts`, `sessionSongs.ts`, `playlistInvites.ts`, playlist pages, join page, join API route.

### 2.1 `listPlaylistsForUser(uid)`

Run **four queries** independently (`mergeSessionQueries` — one failure must not block others):

| Label | Query |
|-------|--------|
| owned-by-ownerId | `where('ownerId', '==', uid)` + `orderBy('date', 'desc')` |
| owned-by-createdBy | `where('createdBy', '==', uid)` + `orderBy('date', 'desc')` |
| shared-with | `where('sharedWith', 'array-contains', uid)` + `orderBy('date', 'desc')` |
| published | `where('status', '==', 'published')` + `orderBy('date', 'desc')` + `limit(PUBLISHED_PLAYLIST_CAP)` |

- Dedupe by session `id`; sort merged list by **`date` desc** (millis).
- Default `PUBLISHED_PLAYLIST_CAP` from `constants.ts` (**100** on web).
- List page sections (after client title filter):
  - **My private playlists:** `isPlaylistOwner && status === 'draft'`
  - **Shared with me (private):** `!owner && sharedWith includes uid && draft`
  - **Public playlists:** `status === 'published'` (includes band-wide published from 4th query)
- Section headings match web: **My private playlists**, **Shared with me**, **Public playlists**.
- When `published.length >= PUBLISHED_PLAYLIST_CAP`, show info banner (same copy as web).

### 2.2 `listOwnedPlaylists(uid)`

Two queries (ownerId + createdBy), merge + dedupe + sort by date — used by **Add to playlist** modal only.

### 2.3 `createSession`

- Fields: `title` trim, `serviceType`, `date` as Firestore `Timestamp`, `songCount: 0`, `status: 'draft'` (default), `createdBy` / `ownerId`, `ownerUsername`, optional `groupId`.
- **Best-effort** `attachPlaylistInviteToken` after create (batch token doc + `shareToken` on session). Failure → session still created without token (warn log on web).

### 2.4 View / edit permissions

**Firestore read** (`sessions/{id}`): auth user AND (published OR owner OR `createdBy` OR in `sharedWith` OR group member OR admin). Flutter musician app: implement **`canViewPlaylist(session, uid)`** with `isAdmin: false`.

```text
canViewPlaylist(session, uid) =
  status === 'published' OR isPlaylistOwner OR sharedWith includes uid
```

**Web UI roles (Flutter v1 = owner-centric, no admin):**

| Flag | Web | Flutter v1 |
|------|-----|------------|
| `canView` | `canViewPlaylist(..., isAdmin)` | Same without admin |
| `canEdit` | `isOwner \|\| isAdmin` | **`isPlaylistOwner` only** |
| `showRowEdit` | `isOwner && editMode` | Same — reorder/key/remove only in owner **Edit** mode |
| `canDelete` | `canEdit` | Owner only |

- **Owner:** add/remove/reorder (edit mode), key override, publish (draft only), delete, share, regenerate invite, `+ Add songs` panel (`canEdit`).
- **Shared member (non-owner):** view draft if in `sharedWith`; read-only song list (display key badge); **no** add/publish/delete/share.
- **Published:** any signed-in user with `canView` may open and **start set**; only owner edits.

Detail when `session` null → **Playlist not found.** When draft and `!canView` → private playlist copy (no songs).

### 2.5 `sessionSongs` subcollection

| Field | Notes |
|-------|--------|
| `songId`, `songTitle` | From index entry on add |
| `order` | Numeric; new song `(songCount + 1) * 1000` in transaction |
| `keyOverride` | `Key \| null` |
| `notes` | Always `null` on add today |
| `addedBy`, `addedAt` | server timestamp |

- **List:** `orderBy('order', 'asc')` — same order as performance nav (Phase 3/4).
- **Add:** transaction sets entry + increments `songCount`; reject duplicate `songId` (“Song is already in this playlist”).
- **Remove:** transaction deletes entry + decrements `songCount` (`Math.max(0, …)`).
- **Reorder:** `reorderSessionSong` / move up/down — **only** updates entry `order` (midpoint); **does not** change `songCount`.
- **Move up/down:** `computeMidOrder` between neighbors; `ORDER_STEP` 1000 for new adds (port `sessionSongs.test.ts`).
- **Maintenance:** `recountSessionSongs` exists on web — port for ops/debug; not required in UI v1.

### 2.6 Live session songs (Flutter port of `useSessionSongsLive`)

- `onSnapshot` on `sessions/{id}/sessionSongs` ordered by `order`.
- **Optimistic add:** append temp row, call `addSongToSession`, drop optimistic id on success, rollback on error.
- Expose `songs`, `isLoading`, `error`, `addSongOptimistic` via Riverpod notifier.

### 2.7 Publish & delete

- **Publish:** `updateSessionStatus(sessionId, 'published')` — owner only (rules). Confirm with `PUBLISH_CONFIRM_MESSAGE` from `playlistLabels.ts`.
- **Delete:** `deleteSession` — batched delete all `sessionSongs`, `playlistInviteTokens/{shareToken}` if present, session doc; decrement `groups/{groupId}.playlistCount` if `groupId` set (Phase 7 groups — port function for correctness).

### 2.8 Invite tokens

- **Generate:** 16 chars from `TOKEN_ALPHABET` (`playlistInviteToken.ts`); port for tests only — **creation** uses Firestore writes from app, not local generate-only for join.
- **Normalize:** `trim` token from URL path.
- **Min length:** **12** (API + client validate).
- **`ensurePlaylistInviteToken`:** if `session.shareToken` doc exists → reuse; else create.
- **`regeneratePlaylistInviteToken`:** delete old token doc, create new, update `shareToken`.

### 2.9 Join flow

**Why API (map §6.1):** Firestore rules do **not** allow invitees to patch `sharedWith` / `sharedMembers` on join. Server uses Admin SDK; client must call HTTPS join route.

**Client (`joinPlaylistByInviteToken`):**

1. Normalize token; length ≥ 12.
2. Require `FirebaseAuth.currentUser`.
3. `POST` with `Authorization: Bearer {idToken}`, body `{ "token": "..." }`.
4. Success → `sessionId` string.

**Server (`api/playlists/join/route.ts`)** — must stay in sync:

| Status | Body | Flutter UX |
|--------|------|------------|
| 200 | `{ sessionId }` | `replace` / `go` to `/playlists/{sessionId}` (web `router.replace`) |
| 401 | Unauthorized | Re-auth |
| 400 | Invalid invite link | Show error |
| 404 | Invalid/expired / playlist not found | Show error |
| 500 | Could not join playlist | Retry message |

**Idempotent:** already owner or in `sharedWith` → 200 with same `sessionId`.

**Join page UX:**

- No token → invalid link.
- Loading + signed in → auto-join once.
- Not signed in → login/signup with `next=/join/p/{token}` (`safeRedirect` port).
- Error → alert + link to `/playlists`.

### 2.10 Share URLs & messages

Port `sharePlaylist.ts`:

- `playlistInvitePath(token)` → `/join/p/{encodeURIComponent(token)}`
- `playlistInviteUrl(token, origin)` → `{origin}/join/p/{encoded}`
- `playlistShareMessage(title, url)` for share sheet text
- `sharePlaylistNative` equivalent via `share_plus`

**Flutter origins:** use `String.fromEnvironment('JOIN_API_BASE_URL', defaultValue: 'https://lfchords.vercel.app')` for API **and** invite link host unless `SHARE_WEB_ORIGIN` is split later.

### 2.11 Playlist detail UX (functional parity)

- Hero: gradient tile (`sessionTileGradient` / `sessionInitials`), `playlistVisibilityLabel`, title, `formatSessionDateLong`, live **song count** (`songs.length`), optional `@{ownerUsername}` when viewer is not owner, `playlistAccessLabel` + `MemberPills` (`maxVisible` 8).
- **Play / Start set:** `startSetHref(sessionId, songs)` → disabled when empty; else first song `playlist` + `index=0`.
- **Song list:** numbered rows; tap title → `sessionSongHref(sessionId, entry, index)`; view mode shows key badge; owner **Edit** mode shows key button, move up/down, remove.
- **Add songs** (`canEdit`): toggle `+ Add songs` panel; search library; show **max 8** results (`addResults.slice(0, 8)`); uses same search/rank as home.
- **Edit mode** (owner only): toggles row chrome (`showRowEdit`); separate from add panel.
- **Publish:** only when `canEdit && status === 'draft'`; confirm `PUBLISH_CONFIRM_MESSAGE`.
- **Share (owner):** (1) **Quick share** — `sharePlaylistNative` when `inviteToken` ready; (2) **Share sheet** — link, URL mono preview, reset link; username form **v1.1** (web modal includes both).
- **Delete:** owner confirm dialog → `deleteSession` → navigate to `/playlists`.
- **Cache offline** icon on web → **hide or disabled** until Phase 6 (no `cacheSessionOffline` call in v1).

### 2.12 Add to playlist (song screen)

- Visible when signed in (`showAddToPlaylist` on web).
- Modal lists **owned** playlists only (`listOwnedPlaylists`).
- Tap → `addSongToSession(playlistId, songId, songTitle, uid)`.
- Row subtitle: `formatPlaylistDate` + `playlistVisibilitySuffix(status)`.
- Empty owned list: “No playlists yet. Create one from the Playlists page.”

### 2.13 `createSession` + rules (`validPlaylistCreate`)

Client create must satisfy rules: `title` string, `date` timestamp, `ownerId == auth.uid`, `sharedWith` list (empty), `status` in `draft` \| `published`. Web also sets `createdBy`, `ownerId`, `songCount: 0`, `serviceType`, `ownerUsername`, timestamps.

### 2.14 Invite token creation (client Firestore)

`generatePlaylistInviteToken()` runs **on device** when owner creates token doc (16 chars, alphabet in `playlistInviteToken.ts`). Batch: `playlistInviteTokens/{token}` + `sessions.shareToken` update. Port **normalize** + **generate** for tests; production uses same writes as `createPlaylistInviteToken` / `attachPlaylistInviteToken`.

### 2.15 Firestore indexes

Ensure composite indexes match `firestore.indexes.json` for:

- `sessions`: `ownerId` + `date`, `createdBy` + `date`, `sharedWith` + `date`, `status` + `date`
- `sessionSongs`: `order` (collection group if used)

Missing index → failed query logged and treated as empty batch on web (`mergeSessionQueries`).

---

## 3. Configuration

| Define | Purpose |
|--------|---------|
| `JOIN_API_BASE_URL` | Prod default `https://lfchords.vercel.app`; staging override |
| `FLAVOR` | Optional dev/prod (Phase 0) |

Document in `mobile/README.md` when added.

---

## 4. Dependencies (`pubspec.yaml`)

```yaml
dependencies:
  http: ^1.2.0           # Join API (roadmap Appendix A)
  share_plus: ^10.0.0    # Invite link share sheet
  url_launcher: ^6.3.0   # Optional: open link in browser
```

Already required from earlier phases: `firebase_auth`, `cloud_firestore`, `go_router`, `flutter_riverpod`.

---

## 5. Architecture (Flutter)

### 5.1 Folder layout

```
mobile/lib/
  core/
    network/join_api_client.dart
    config/app_config.dart          # JOIN_API_BASE_URL, share origin
  domain/
    playlist_invite_token.dart      # normalizeInviteToken (port)
    share_playlist.dart             # URL builders + messages
    session_display.dart            # port sessionDisplay.ts
    playlist_labels.dart
    playlist_members.dart
  data/
    session_repository.dart         # sessions.ts ports
    session_songs_repository.dart   # sessionSongs.ts + live stream
    playlist_invites_repository.dart # ensure/regenerate (Firestore)
  features/playlists/
    playlists_screen.dart
    create_playlist_screen.dart
    playlist_detail_screen.dart
    join_playlist_screen.dart
    widgets/
      playlist_card.dart
      share_playlist_sheet.dart
      add_to_playlist_sheet.dart
      session_song_row.dart
  features/song/
    song_screen.dart                # wire AddToPlaylist sheet
```

### 5.2 Riverpod (sketch)

| Provider | Role |
|----------|------|
| `playlistsListProvider` | `listPlaylistsForUser(uid)` + refresh |
| `playlistDetailProvider(sessionId)` | `getSession` + watch |
| `sessionSongsProvider(sessionId)` | snapshot stream + optimistic add |
| `ownedPlaylistsProvider` | modal list |
| `joinPlaylistController` | token → API → navigate |

### 5.3 Routing (`go_router`)

| Route | Auth | Notes |
|-------|------|--------|
| `/playlists` | Yes | Tab |
| `/playlists/new` | Yes | |
| `/playlists/:id` | Yes | `canView` guard → message or redirect |
| `/join/p/:token` | Join requires auth | **No** username gate (match web join layout); login/signup `next` preserves token path |
| `/playlists/*` | Yes + username | Match `UsernameGate` — redirect to `/onboarding/username` if profile missing username |

**Deep link:** map `https://lfchords.vercel.app/join/p/*` to `/join/p/:token` (Android App Links / iOS universal links — Phase 8 ops).

---

## 6. Sub-phases (implementation order)

### Phase 5A — Domain + repositories (3–4 days)

- [ ] Port `getPlaylistOwnerId`, `isPlaylistOwner`, `canViewPlaylist`.
- [ ] `SessionRepository`: create, get, list merged queries, update status, delete, share-by-username **stub/defer**.
- [ ] `SessionSongsRepository`: add, remove, move up/down, key override, `listSessionSongs`.
- [ ] `playlist_invite_token.dart` (`normalizeInviteToken`, `generatePlaylistInviteToken` for owner writes).
- [ ] `share_playlist.dart` URL builders + tests from `sharePlaylist.test.ts`.
- [ ] Unit tests: `computeMidOrder`, merge dedupe sort (from `sessionSongs.test.ts`).

### Phase 5B — Join API + join route (2–3 days)

- [ ] `JoinApiClient` with Bearer token refresh on 401.
- [ ] `join_playlist_screen.dart` parity with web join page.
- [ ] Router + `safeRedirect` for `next` param.

### Phase 5C — List + create UI (2–3 days)

- [ ] `playlists_screen.dart` sections + search.
- [ ] `create_playlist_screen.dart`.
- [ ] `PlaylistCard` port (date, status, song count).

### Phase 5D — Detail + live songs (4–5 days)

- [ ] `playlist_detail_screen.dart` hero, play CTA, members.
- [ ] Live `sessionSongs` stream + loading/error states.
- [ ] Add-song panel (reuse library search).
- [ ] Edit mode: remove confirm, reorder, key modal.

### Phase 5E — Share + invites (2–3 days)

- [ ] `playlist_invites_repository`: ensure + regenerate.
- [ ] `SharePlaylistModal` → bottom sheet; `share_plus`.
- [ ] Owner-only gating for share actions.

### Phase 5F — Publish, delete, song screen add (2 days)

- [ ] Publish / delete confirms.
- [ ] `AddToPlaylist` sheet on `SongScreen`.
- [ ] **P1:** Home “My playlists” strip (2 cards + 3-line preview).

### Phase 5G — QA (2–3 days)

- [ ] Two devices/accounts: share link → join → see set.
- [ ] Idempotent re-join.
- [ ] Reorder + performance nav index alignment.
- [ ] Wrong `JOIN_API_BASE_URL` failure documented in README.

---

## 7. Testing plan

| Layer | What |
|-------|------|
| Unit | `share_playlist` URLs; `normalizeInviteToken`; `computeMidOrder`; `canViewPlaylist` |
| Unit | `session_navigation` hrefs (Phase 3/4) with `keyOverride` |
| Widget | Playlists list empty/loading; join screen signed-out |
| Integration | Optional: mock `http` join client |
| Manual | Create → add 5 songs → reorder → publish → share → second user join → start set → Phase 4 nav |

**Web tests to mirror:** `sessionSongs.test.ts`, `sharePlaylist.test.ts`, `sessions.integration.test.ts`, `deleteAccess.test.ts`, `playlistMembers.test.ts`.

---

## 8. Definition of done (Phase 5)

- [ ] Signed-in user sees merged playlist list matching web queries (owned, shared, published cap).
- [ ] Create playlist navigates to detail with draft status.
- [ ] Owner can add/remove/reorder songs and set per-song key override.
- [ ] Owner can publish and delete with confirm dialogs.
- [ ] Owner can copy/share invite link; regenerate invalidates old token.
- [ ] Recipient opens join deep link, signs in, joins via API, lands on playlist detail.
- [ ] Re-join returns success without duplicate errors.
- [ ] Start set opens song route with `playlist` + `index=0`.
- [ ] Add to playlist from song screen works for owned playlists.
- [ ] Set list row opens song with correct `playlist`, `index`, optional `key`.
- [ ] Shared member sees draft read-only; owner edit/publish/share works.
- [ ] Public list shows cap banner when at `PUBLISHED_PLAYLIST_CAP`.
- [ ] Roadmap Phase 5 marked complete; link to this doc in roadmap.

---

## 9. Roadmap & matrix traceability

| Roadmap / matrix item | Section |
|-----------------------|---------|
| `listPlaylistsForUser` | §2.1, 5C |
| Create playlist + session songs | §2.3, §2.5, 5D |
| Reorder / key override | §2.5, §2.11, 5D |
| Matrix “notes” (§3.6) | Field on create only — no edit UI (§ out of scope) |
| Playlist nav from detail rows | §2.11 → Phase 3/4 `sessionSongHref` |
| Publish status display | §2.7, 5F |
| Invite link + join API | §2.8–2.9, 5B, 5E |
| Share by @username | Deferred v1.1 |
| Offline prefetch | Phase 6 |
| Groups playlists | Phase 7 |
| Song share URL (matrix P1) | Optional 5F with `share_plus` on song screen |

---

## 10. Web file → Flutter port map

| Web file | Flutter target |
|----------|----------------|
| `lib/firestore/sessions.ts` | `session_repository.dart` |
| `lib/firestore/sessionSongs.ts` | `session_songs_repository.dart` |
| `lib/firestore/playlistInvites.ts` | `playlist_invites_repository.dart` + `join_api_client.dart` |
| `lib/playlistInviteToken.ts` | `playlist_invite_token.dart` (normalize + generate) |
| `lib/sharePlaylist.ts` | `share_playlist.dart` |
| `lib/playlistMembers.ts` | `playlist_members.dart` |
| `lib/playlistLabels.ts` | `playlist_labels.dart` |
| `lib/sessionDisplay.ts` | `session_display.dart` |
| `lib/constants.ts` | `PUBLISHED_PLAYLIST_CAP` in domain/constants |
| `hooks/useSessionSongsLive.ts` | `sessionSongsProvider` |
| `app/api/playlists/join/route.ts` | **Server** — contract only in client |
| `app/join/p/[token]/page.tsx` | `join_playlist_screen.dart` |
| `app/(app)/playlists/page.tsx` | `playlists_screen.dart` |
| `app/(app)/playlists/new/page.tsx` | `create_playlist_screen.dart` |
| `app/(app)/playlists/[id]/page.tsx` | `playlist_detail_screen.dart` |
| `components/PlaylistCard.tsx` | `playlist_card.dart` |
| `components/SharePlaylistModal.tsx` | `share_playlist_sheet.dart` |
| `components/AddToPlaylistModal.tsx` | `add_to_playlist_sheet.dart` |
| `components/MemberPills.tsx` | widget in detail screen |

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Wrong `JOIN_API_BASE_URL` in release | Document define; smoke test join on internal build |
| Firestore index missing | Ship with same `firestore.indexes.json`; catch failed queries like web |
| Token &lt; 12 chars in old links | Same validation as API |
| Rules deny `sharedWith` self-update | Never client-write join; API only |
| Large set reorder races | Mid-order algorithm + live snapshot |
| `sharePlaylistByUsername` requested early | v1.1 — invite link covers collaboration |
| Group playlist `groupId` on create | Defer UI; repository supports field if rules allow |
| Optimistic add `order` vs `songCount` txn | Server order uses `songCount`; snapshot replaces optimistic row |
| Username gate blocks new user join → browse | Join route skips gate; after join user may still need username for `/playlists` tab |
| Hiding offline button confuses web parity | Phase 5 may hide until Phase 6 wires `cacheSessionOffline` |

---

## 12. What comes next (not Phase 5 gaps)

| Web map | Phase |
|---------|--------|
| `cacheSessionOffline`, download set UX | 6 |
| Connectivity banner | 6 |
| Groups CRUD, home group playlists | 7 |
| Share-by-username | v1.1 |
| App Links / Play Store | 8 |

---

## 13. After Phase 5

- **Phase 6:** [`flutter-phase-6-offline.md`](flutter-phase-6-offline.md) — offline prefetch + connectivity banner.
- **Phase 2 doc:** Home playlist preview P1 can be checked off when 5F ships.
- **Phase 4 doc:** Set navigation fully exercised from playlist detail “Start set”.

---

*End of Phase 5 plan.*
