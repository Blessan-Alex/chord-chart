# Flutter Phase 7 — Web MVP groups parity report

**Status:** Phase A complete (read-only web audit). **Phase B (Flutter)** starts only after user says **“go”.**

**Sources read:** `webmvp/src/lib/firestore/groups.ts`, `sessions.ts` (group paths), `users.ts` (via groups imports), `webmvp/src/app/(app)/groups/page.tsx`, `groups/[id]/page.tsx`, `CreateGroupModal.tsx`, `JoinGroupModal.tsx`, `HomePage.tsx`, `SharePlaylistModal.tsx`, `firestore.rules`, `firestore.indexes.json`, `webmvp/src/lib/__tests__/integration/rules.integration.test.ts`.

**Cross-refs:** [`flutter-phase-7-groups.md`](flutter-phase-7-groups.md), [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.7, §4.8–4.9, [`flutter-roadmap.md`](flutter-roadmap.md) Phase 7.

---

## 1. Data model

### `groups/{groupId}` (`docs/flutter-web-app-map.md` §4.8 + web writes)

| Field | Type / notes | Set on create (`groups.ts:114-127`) |
|-------|----------------|--------------------------------------|
| `name` | string, trimmed | ✓ |
| `ownerId` | string | ✓ creator uid |
| `ownerUsername` | optional | ✓ from profile |
| `memberIds` | string[] | ✓ `[ownerId]` |
| `members` | `GroupMemberInfo[]` | ✓ `[owner]` via `memberFromProfile` |
| `inviteCode` | 8-char string | ✓ doc id alphabet |
| `playlistCount` | int | ✓ `0` |
| `createdAt` / `updatedAt` | server timestamp | ✓ |

### `groupInviteCodes/{code}` (§4.9)

| Field | Notes | `groups.ts:131-136` |
|-------|--------|---------------------|
| Doc ID | **= invite code** (8 chars) | ✓ |
| `groupId` | pointer | ✓ new group ref id |
| `ownerId` | creator | ✓ |
| `name` | group name copy | ✓ |
| `createdAt` | server timestamp | ✓ |

**Rules:** `get` if auth; **`list: false`** (`firestore.rules:199-203`).

---

## 2. `listGroupsForMember`

```text
query(groups, where('memberIds', 'array-contains', uid), orderBy('name', 'asc'))
```

- Implementation: `webmvp/src/lib/firestore/groups.ts:84-95`
- **Composite index required:** `memberIds` CONTAINS + `name` ASC — `firestore.indexes.json:67-73`

---

## 3. `createGroup` batch

Sequence (`groups.ts:98-143`):

1. Validate trimmed `name` non-empty → else `"Group name is required"`.
2. `generateInviteCode()` — 8 chars from **`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`** (`groups.ts:48-54`).
3. `writeBatch`: `set(groups/{newId}, data)` + `set(groupInviteCodes/{inviteCode}, { groupId, name, ownerId, createdAt })`.
4. `getGroup` → return or `"Failed to read created group"`.

**Rules create** (`firestore.rules:221-228`): `ownerId == auth.uid`, owner in `memberIds`, `name`, `inviteCode`, `memberIds`, `members` lists, `playlistCount` int.

---

## 4. `joinGroupByInviteCode` — rules-critical

Sequence (`groups.ts:146-188`):

1. `inviteCode = trim().toUpperCase()`; length **≠ 8** → `"Invite code must be 8 characters"`.
2. `getDoc(groupInviteCodes/{code})` — missing → **`"Invalid invite code"`**.
3. Read `groupId` from invite doc; `getDoc(groups/{groupId})`.
4. If uid **already** in `memberIds` → return existing group (**idempotent**, `groups.ts:171-173`).
5. `member = memberFromProfile(uid, profile)`.
6. **`updateDoc(groupRef, { ... })`** — exact fields:

```typescript
// groups.ts:178-182
await updateDoc(groupRef, {
  memberIds: arrayUnion(uid),
  members: arrayUnion(member),
  updatedAt: serverTimestamp(),
});
```

### `isGroupJoinUpdate()` — must match (`firestore.rules:64-71`)

```javascript
function isGroupJoinUpdate() {
  return isAuth()
    && request.auth.uid in request.resource.data.memberIds
    && !(request.auth.uid in resource.data.memberIds)
    && request.resource.data.memberIds.size() == resource.data.memberIds.size() + 1
    && request.resource.data.ownerId == resource.data.ownerId
    && request.resource.data.inviteCode == resource.data.inviteCode
    && request.resource.data.name == resource.data.name;
}
```

**Flutter port checklist:**

| Do | Don’t |
|----|--------|
| `arrayUnion` for `memberIds` and `members` | Replace entire arrays manually |
| Leave `ownerId`, `inviteCode`, `name` unchanged | Touch `playlistCount`, `inviteCode`, rename group |
| Single new member (size + 1) | Batch multiple joins in one update |

**#1 production failure:** extra fields changed on join → **`permission-denied`**.

**Note:** Rules do **not** name-check `members` content for join path; only `memberIds` size/immutables.

---

## 5. `inviteGroupMemberByUsername` (owner only)

`groups.ts:191-232`:

1. `isGroupOwner` → else **`"Only the group owner can invite members"`**.
2. `validateUsername` → validation error string.
3. `resolveUsernameToUid` → **`"Username not found"`**.
4. Already in `memberIds` → **`"That user is already a member"`** (covers self if owner already listed).
5. Load invitee profile from `users/{uid}`; `memberFromProfile`.
6. Same **`updateDoc`** shape as join: `arrayUnion` on `memberIds`, `members`, `updatedAt`.
7. **Rules path:** `resource.data.ownerId == request.auth.uid` (`firestore.rules:230-231`) — not `isGroupJoinUpdate`.

**No explicit “cannot invite yourself”** if not already member — unlikely for owner; product OK.

---

## 6. `deleteGroup` cascade

`groups.ts:256-288`:

1. Allowed if `isGroupOwner(group, actorUid) || isAdmin` — mobile **owner only** (no admin).
2. `listPlaylistsForGroup(group.id, { strict: true })`.
3. For each session: `deleteSession(session, actorUid, { isAdmin, asGroupOwner, skipGroupCountUpdate: true })`.
4. `commitBatchedDeletes`: `groupInviteCodes/{group.inviteCode}` + `groups/{group.id}`.
5. UI navigates **`router.replace("/groups")`** (`groups/[id]/page.tsx:159`).

**Confirm dialog copy** (`page.tsx:173-177`): `"${group.name}" and all ${group.playlistCount} group playlist(s) will be removed permanently. Members will lose access.`

---

## 7. `listPlaylistsForGroup` + create from group detail

**Query** (`sessions.ts:303-328`):

```text
where('groupId', '==', groupId), orderBy('date', 'desc'), optional limit()
```

- Index: `sessions` — `groupId` ASC + `date` DESC (`firestore.indexes.json:59-65`).
- `strict: true` → throw; default → log warn, return `[]`.

**New playlist** (`groups/[id]/page.tsx:122-148`):

| Step | Web behavior |
|------|----------------|
| Who | Any **member** on detail (`canView`) — button not owner-only |
| Title | `` `${group.name} set list` `` |
| Fields | `serviceType: 'sunday_morning'`, `date: new Date()`, `status: 'draft'`, `groupId: group.id` |
| Actor | `createSession(..., user.uid, profile?.username)` |
| After | **`incrementGroupPlaylistCount(group.id)`** then `refresh()` |
| Message | `"Playlist created"` |

**Order:** create session **then** increment count; if create throws, do not increment (web `try/catch` in handler).

---

## 8. vs `listPlaylistsForUser`

- `listPlaylistsForUser` merges owned / shared / published only (`sessions.ts:187-221`) — **no `groupId` filter**.
- Group playlists appear via **`listPlaylistsForGroup`** + home section — **not** in personal playlists tab merge.
- `/playlists/new` does **not** set `groupId` — group sets created only from **group detail** (`+ New playlist`).

---

## 9. Group list / detail UX

### List (`groups/page.tsx`)

| Element | Copy / behavior |
|---------|-----------------|
| Subtitle | **“Band teams and shared playlists”** (`page.tsx:132-134`) |
| Actions | **Join** (text), **Create** (`+` round, `aria-label="Create group"`) |
| Empty | **“No groups yet”** / **“Create a group or join with an invite code.”** |
| Row | Name, member + playlist counts, `MemberPills`, link → `/groups/{id}` |

### Detail (`groups/[id]/page.tsx`)

| Section | Notes |
|---------|--------|
| Back | **“← Groups”** |
| Delete | Owner **or admin** on web; confirm dialog |
| Non-member | **“You do not have access to this group.”** (`canView` false) |
| Missing doc | **“Group not found.”** (includes permission-denied on `getGroup` for non-member — catch shows message) |
| Members | `MemberPills`, max 8 on detail |
| Invite code | Mono display + **“Copy code”** → **“Invite code copied”** or fallback show code |
| Username invite | Owner only; placeholder **`@username`**; success **`Invited @{username}`** |
| Playlists empty | **“No group playlists yet.”** |
| New | **“+ New playlist”** |

---

## 10. Home section algorithm (critical)

Gate (`HomePage.tsx:519`): **`user`** && **no** search query && **no** key/language/artist filters (same block as “My playlists”).

Also waits for **`!indexLoading`** before social fetch (`HomePage.tsx:292-295`, effect deps `user, indexLoading`).

Numbered steps (`HomePage.tsx:303-357`):

1. `ownedPlaylists = listOwnedPlaylists(uid)` → **`owned = ownedPlaylists.slice(0, 2)`** → `setMyPlaylists`.
2. `groups = listGroupsForMember(uid)` — on error **`catch` → `[]`** + console warn (`319-321`).
3. **`setMyGroups(groups.slice(0, 2))`** — only first two groups kept for name lookup.
4. **`groupPlaylistLists = await Promise.all(groups.slice(0, 2).map(g => listPlaylistsForGroup(g.id, { limit: 2 }).catch(() => [])))`**.
5. **`groupSessions = groupPlaylistLists.flat().slice(0, 2)`** — **at most 2 cards total**, NOT 2 per group.
6. `setGroupPlaylists(groupSessions)`.
7. Preview map: **`previewSessions = [...owned, ...groupSessions].slice(0, 4)`** — up to 4 sessions for song line fetch.
8. Per session: `listSessionSongs` → **3** preview lines `{ title, artist }` (`346-349`); failures → `[]` for that id.
9. Section title **“Group playlists”**, see-all **`/groups`** (`552-553`).
10. Subtitle on card: **`${groupName} · ${songCount} song(s)`** when `session.groupId` matches `myGroups` (`559-574`); else song count only.

**Empty group section:** **“No group playlists yet. Join or create a group”** (link `/groups`) (`583-588`).

---

## 11. Playlist access for group members

**Firestore (source of truth)** — `canReadPlaylist` / session read (`firestore.rules:74-84`, `141+`):

- Draft group playlist readable if **`isGroupMember(session.groupId)`** (and other paths).

**Client JS gap:** `canViewPlaylist` in `sessions.ts:95-105` does **NOT** include group membership — only published / owner / shared / admin.

**Implication for Flutter Phase 7:**

- Extend **`canViewPlaylist`** (or parallel helper) to treat **`session.groupId` + `isGroupMember`** like rules, or members may see **“private playlist”** UI while Firestore read succeeds.
- Phase 5 mobile `playlist_access.dart` today matches web JS (no group) — **must fix in 7A/7D**.

**Navigation:** `/playlists/:id` from group cards; no special route — member read enforced by rules + client gate.

---

## 12. Admin on web vs mobile

| Action | Web | Flutter Phase 7 |
|--------|-----|-----------------|
| Delete group | `isGroupOwner \|\| isAdmin` (`groups/[id]/page.tsx:84`, `deleteGroup`) | **Owner only** |
| Delete group playlist | Rules: playlist owner **or** group owner **or** admin (`canDeletePlaylist`) | Playlist owner or group owner; **no admin** |
| Read group | Member or admin | Member only |

---

## 13. Share-by-username (7G polish)

**Web:** `sharePlaylistByUsername` (`sessions.ts:253-300`):

- Playlist **owner** only.
- `validateUsername` → `resolveUsernameToUid`.
- Errors: not found (`No user @…`), self, already in `sharedWith`.
- Updates `sharedWith` + `sharedMembers` via `arrayUnion`.

**UI:** `SharePlaylistModal.tsx` — username form + invite link block (`onShare`, `onRegenerateLink`).

**Flutter Phase 5:** username share **deferred**; Phase **7G optional** — add to `SharePlaylistSheet` / repository port.

**Distinct from group invite:** group uses `groups.inviteGroupMemberByUsername`; playlist share uses **session** `sharedWith`.

---

## 14. Test / rules references

| Test | File | Coverage |
|------|------|----------|
| Group owner create | `rules.integration.test.ts:466-480` | `setDoc` groups |
| Non-member read denied | `:483-498` | `getDoc` groups |
| Member read allowed | `:501-519` | |
| Member read group **session** | `:522-554` | `sessions` with `groupId` |
| Invite code get, list denied | `:582-623` | `groupInviteCodes` |
| **`joinGroupByInviteCode` / `isGroupJoinUpdate`** | — | **No dedicated integration test** — port behavior from rules + `groups.ts` |

**Unit cases to port (Flutter 7A):**

- Normalize invite code trim/uppercase; reject length ≠ 8.
- Idempotent join when uid ∈ `memberIds`.
- `generateInviteCode` length 8 and alphabet subset.
- `isGroupOwner` / `isGroupMember` helpers.

---

## 15. Worked scenarios (two accounts)

1. **A** creates group → batch group + `groupInviteCodes/{code}`; A sees group on `/groups`.
2. **B** joins via **Join** modal, 8-char code → `updateDoc` with **`arrayUnion` only**; B sees group in list.
3. **B** (or A) taps **+ New playlist** on group detail → session with `groupId`, count incremented.
4. **B** opens `/playlists/{id}` — rules allow read; **client must** extend `canViewPlaylist` for UI.
5. **A** (owner) deletes group → all group playlists removed via `deleteSession(..., asGroupOwner: true)`, invite doc + group doc deleted → `/groups`.

---

## 16. Doc vs web (`flutter-phase-7-groups.md` §2)

| Topic | Verdict | Notes |
|-------|---------|--------|
| Data model §2.1 | **WEB WINS** | Matches `groups.ts` |
| Join update fields §2.4 / §2.8 | **WEB WINS** | Exact `updateDoc` cited |
| Home flatten §2.11 | **WEB WINS** | Doc correctly says 2 total after flat |
| `canViewPlaylist` + group | **DOC WINS (intent)** | Doc cites **rules** `canReadPlaylist`; web **JS** helper omits group — Flutter should implement **rules-aligned** client check |
| Admin delete | **DOC WINS** | Mobile owner-only intentional |
| Share-by-username | **WEB WINS** | In scope 7G optional |
| Playlist delete by group owner | **RULES WIN** | Web playlist page `canDelete = canEdit` (owner only) — group owner deleting **group playlist** may need Phase 5+7 UI using `asGroupOwner` on delete (verify when implementing 7D) |

---

## 17. Intentional mobile diffs

| Topic | Flutter |
|-------|---------|
| Invite copy | `Clipboard.setData` vs `navigator.clipboard` |
| Home path | `/home` vs `/` |
| Admin | Ignored on group delete / bypass |
| Group join | Firestore client only — **no HTTP API** |
| Deep links / QR | Out of scope |

---

## 18. Proposed mobile-only changes (Phase B backlog)

| Item | Priority | Rationale |
|------|----------|-----------|
| Extend `canViewPlaylist` with group membership lookup | **P0** | Rules allow read; Phase 5 helper incomplete |
| Cache `Group` on playlist detail for delete `asGroupOwner` | **P1** | Avoid extra `getGroup` on delete |
| Pull-to-refresh on `/groups` | **P2** | Web reloads on navigation only |
| Share-by-username in sheet | **P1 (7G)** | Roadmap v1.1 |
| Group owner delete on playlist detail | **P0** | Match `canDeletePlaylist` rules, not web UI `canDelete=canEdit` only |

---

## Phase B preview (do not implement until **“go”**)

| Sub-phase | Report § | Primary Flutter targets |
|-----------|----------|-------------------------|
| **7A** | §2–5, §14 | `groups_repository.dart`, domain `group.dart`, tests |
| **7B** | §9 list | `groups_screen.dart`, create/join sheets |
| **7C** | §9 detail | `group_detail_screen.dart` |
| **7D** | §7–8, §11 | `session_repository.dart`, `playlist_access.dart`, detail delete |
| **7E** | §10 | `home_screen.dart` group strip |
| **7F** | §15 | Router `/groups`, shell tab, QA |
| **7G** | §13 | `sharePlaylistByUsername`, sheet |

**Existing Flutter gaps (pre–Phase 7):** `canViewPlaylist` no `groupId`; `SessionRepository` may need `listPlaylistsForGroup`, `createSession` with `groupId`, `deleteSession` `asGroupOwner`; shell Groups tab likely stub.

---

## Phase B implementation map (completed)

| Sub-phase | Delivered |
|-----------|-----------|
| **7A** | `lib/domain/group.dart`, `lib/data/repositories/groups_repository.dart`, `lib/providers/group_providers.dart` |
| **7B** | `lib/features/groups/groups_screen.dart`, `widgets/group_sheets.dart` (create + join; join helper: *Enter the 8-character code from your group leader.*) |
| **7C** | `lib/features/groups/group_detail_screen.dart` — members, copy invite code, owner @username invite, new group playlist, delete group (owner only) |
| **7D** | `session_repository.dart` — `listPlaylistsForGroup`, `createSession(groupId:)`, `deleteSession(..., asGroupOwner:)`, `sharePlaylistByUsername`; `playlist_access.dart` group view/delete; `playlist_detail_screen.dart` gates + delete |
| **7E** | `home_screen.dart` — **GROUP PLAYLISTS** strip (`homeGroupPlaylistsPreviewProvider`, song previews, group name subtitle); gated like web (signed in, no search/filters, index loaded) |
| **7F** | `route_paths.dart` `/groups`, shell tab, `group_detail` route, login redirect |
| **7G** | `SharePlaylistSheet` @username block + repository port |

**Tests:** `test/domain/group_test.dart`, extended `playlist_access_test.dart`.

**Mobile-only (per §18):** Group membership in `canViewPlaylist`; group owner delete on playlist detail; no admin bypass on group delete.

---

*End of Phase A report. Phase B map appended after Flutter implementation.*
