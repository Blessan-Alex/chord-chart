# Flutter Phase 7 — Groups (v1.1) + collaboration polish

**Parent:** [`flutter-roadmap.md`](flutter-roadmap.md) Phase 7  
**Parity specs:** [`flutter-web-app-map.md`](flutter-web-app-map.md) §3.7, data §4.8–4.9, sessions `groupId` §4.5  
**Roadmap alignment:** Matrix §3 — groups list/join/group playlists (v1.1 P1); **optional polish:** share playlist by @username (v1.1), recent songs, Crashlytics, golden tests (roadmap Phase 7 buffer)  
**Depends on:** [Phase 1](flutter-phase-1-auth.md) (auth, username, profile), [Phase 5](flutter-phase-5-playlists.md) (`createSession`, `listPlaylistsForGroup`, `deleteSession` with `asGroupOwner`), [Phase 2](flutter-phase-2-library.md) (home sections)  
**Backend:** Firestore `groups`, `groupInviteCodes`; client writes only (no join API for groups)

**Goal:** Band/team **groups** on mobile: create group, join with **8-character invite code**, list members, **group playlists** (sessions with `groupId`), create group set lists — same rules and UX as web. Plus v1.1 **polish** items from roadmap (share-by-username, home group previews, optional Crashlytics).

**Estimate:** 2 person-weeks (1 FTE) for groups core; +0.5 pw if all polish items included

**Product label:** Roadmap **v1.1** — ship after Phases 1–6 Android beta unless product moves groups into v1.

---

## 1. Scope summary

### In scope (Phase 7 — groups core)

| Area | Web reference | Flutter deliverable |
|------|---------------|---------------------|
| Auth gate | `SignInRequired` | `/groups`, `/groups/:id` require sign-in + username gate (Phase 1) |
| List groups | `listGroupsForMember`, `groups/page.tsx` | `/groups` — query `memberIds array-contains uid`, `orderBy name` |
| Create group | `createGroup`, `CreateGroupModal` | Name field; batch `groups` + `groupInviteCodes/{code}` |
| Join by code | `joinGroupByInviteCode`, `JoinGroupModal` | 8 chars, uppercase trim; idempotent if already member |
| Group detail | `groups/[id]/page.tsx` | Members, invite code + copy, group playlists list |
| Invite code display | `group.inviteCode` on detail | Mono spaced; copy to clipboard |
| Invite by username | `inviteGroupMemberByUsername` | **Owner only** — form on detail (web parity) |
| Group playlists | `listPlaylistsForGroup`, `PlaylistCard` | Ordered by `date` desc; tap → Phase 5 detail |
| New group playlist | `createSession` + `groupId`, `incrementGroupPlaylistCount` | Default title `{group.name} set list`, draft, `sunday_morning`, today |
| Delete group | `deleteGroup` | Owner confirm; cascades invite doc + all group playlists via `deleteSession(..., asGroupOwner)` |
| Access helpers | `isGroupOwner`, `isGroupMember` | Domain + UI gates |
| Home previews | `HomePage` “Group playlists” section | **P1:** from first **2** groups fetch up to 2 playlists each → **flatten → take 2** total cards; `PlaylistPreviewCard` subtitle includes group name; 3 song preview lines (shared preview map with “My playlists”) |
| Shell nav | Web sidebar Groups | Tab/route `/groups` in Phase 1 shell |
| Playlist read for members | `canReadPlaylist` + `groupId` | Group members open group playlists (Phase 5 detail) |
| `resolveUsernameToUid` | `users.ts` | `usernames/{lower}` lookup — group invite + playlist share (§3) |
| `getUserProfile` | `users.ts` | `createGroup`, `joinGroupByInviteCode`, `handleCreatePlaylist` on web |
| Join modal UX | `JoinGroupModal` | `maxLength` 8, uppercase as typed, submit disabled until `code.length === 8`, helper copy |
| Group playlist delete | `canDeletePlaylist` + `deleteSession` | Playlist **owner** or **group owner** may delete group playlists (Phase 5 delete UI; `asGroupOwner` when applicable) |
| Permission errors | Firestore read rules | Non-member `getGroup` → permission denied — show load error (web); no public group preview |

### In scope (Phase 7 — polish buffer, roadmap)

| Item | Web reference | Priority |
|------|---------------|----------|
| Share playlist by @username | `sharePlaylistByUsername` in `sessions.ts` | **P1 v1.1** — enable Share sheet username block deferred from Phase 5 |
| Recent songs polish | `recentSongs.ts` | **P1** — UI polish if Phase 2 P1 incomplete |
| Firebase Crashlytics | Roadmap v1.1 | **P2 optional** — `firebase_crashlytics` + Flutter hook |
| Chart golden tests hardening | Phase 3 | **P2 optional** — expand goldens for release confidence |

### Out of scope (Phase 7)

| Item | Note |
|------|------|
| Admin group delete bypass | **Ignore `isAdmin`** — owner-only delete on mobile |
| Enumerate all invite codes | Rules: `groupInviteCodes` list denied |
| Group deep links / QR | Web has no dedicated join URL — code entry only |
| Edit group name / rotate code | Not on web v1 — out unless product adds |
| Non-member browse groups | Read denied by rules |
| Guest groups | Auth required |

### Mobile vs web (intentional)

| Topic | Web | Flutter Phase 7 |
|-------|-----|------------------|
| Copy invite code | `navigator.clipboard` | `Clipboard.setData` / `flutter/services` |
| Create group entry | `+` round button | Same pattern |
| Home path | `/` sections | `/home` sections |
| Admin delete group | `isAdmin` | Owner only |

---

## 2. Web behavior checklist (must match)

Sources: `firestore/groups.ts`, `groups/page.tsx`, `groups/[id]/page.tsx`, `firestore.rules`, `sessions.ts` (`listPlaylistsForGroup`, `createSession` with `groupId`).

### 2.1 Data model

**`groups/{groupId}`** (map §4.8): `name`, `ownerId`, `ownerUsername?`, `memberIds[]`, `members[]` (`GroupMemberInfo`), `inviteCode` (8 chars), `playlistCount`, `createdAt`, `updatedAt`.

**`groupInviteCodes/{code}`** (§4.9): `groupId`, `ownerId`, `name`, `createdAt`. Doc id = code. **get** only for auth users; **list** false.

### 2.2 `listGroupsForMember(uid)`

```text
query(groups, where('memberIds', 'array-contains', uid), orderBy('name', 'asc'))
```

Requires composite index in `firestore.indexes.json`.

### 2.3 `createGroup`

1. Validate non-empty trimmed `name`.
2. Generate **8-char** code (`A-Z` + `2-9`, no ambiguous chars) — same alphabet style as web `generateInviteCode`.
3. Batch: create group doc with `memberIds: [ownerId]`, `members: [owner]`, `playlistCount: 0`, `inviteCode`; create `groupInviteCodes/{inviteCode}` pointer.
4. Load profile for owner `GroupMemberInfo` (`memberFromProfile`).

### 2.4 `joinGroupByInviteCode`

1. `trim().toUpperCase()`; length must be **8**.
2. `get groupInviteCodes/{code}` — missing → “Invalid invite code”.
3. Load group; if uid already in `memberIds` → return group (idempotent).
4. `updateDoc`: `memberIds arrayUnion(uid)`, `members arrayUnion(member)`, `updatedAt`.
5. Must satisfy **`isGroupJoinUpdate()`** in rules (§2.8).

### 2.5 `inviteGroupMemberByUsername` (owner)

1. `validateUsername` + `resolveUsernameToUid`.
2. Reject self, not found, already member.
3. Owner-only update (`resource.ownerId == auth.uid` in rules).
4. `arrayUnion` on `memberIds` and `members` with profile-derived member info.

### 2.6 Group detail playlists

- `listPlaylistsForGroup(groupId)` — `where('groupId', '==', groupId)`, `orderBy('date', 'desc')`.
- **New playlist:** any member with UI access can tap “+ New playlist” on web — uses acting user as `createdBy`; sets `groupId`; then `incrementGroupPlaylistCount`.
- Cards reuse `PlaylistCard` (song count, link to `/playlists/{id}`).
- Group members read playlists via Firestore `canReadPlaylist` when `isGroupMember(groupId)`.

### 2.7 `deleteGroup`

1. Owner only on mobile (web: owner or admin).
2. `listPlaylistsForGroup` strict; foreach `deleteSession(session, actor, { asGroupOwner: true, skipGroupCountUpdate: true })`.
3. Batch delete `groupInviteCodes/{inviteCode}` + `groups/{id}`.
4. Navigate to `/groups`.

### 2.8 Firestore rules (client must match)

**`isGroupJoinUpdate()`** — non-owner self-join:

- Auth required.
- `auth.uid` in **new** `memberIds`, not in **old** `memberIds`.
- `memberIds.size() == old.size() + 1`.
- `ownerId`, `inviteCode`, `name` unchanged.

**Implication:** Flutter join update must not alter `ownerId`, `inviteCode`, or `name`; use `arrayUnion` for `memberIds`/`members` and `serverTimestamp()` for `updatedAt` only.

**Owner updates** (username invite): `resource.data.ownerId == auth.uid` — may `arrayUnion` new members; not subject to `isGroupJoinUpdate` size check.

**Group read:** `auth.uid in resource.data.memberIds` (or admin — ignore admin on mobile).

**Group create:** `ownerId == auth.uid`, owner in `memberIds`, `name`, `inviteCode`, `memberIds`, `members`, `playlistCount` int per rules §221–228.

**`groupInviteCodes` create:** `groupId`, `ownerId == auth.uid`, `name`, `createdAt` on batch with group create.

**Sessions index:** composite `groupId` ASC + `date` DESC (`firestore.indexes.json`) for `listPlaylistsForGroup`.

### 2.9 Groups list UI

- Subtitle: “Band teams and shared playlists”.
- Actions: **Join** (modal), **Create** (`+`).
- Rows: name, member count, playlist count, `MemberPills`, link to detail.
- Empty state: create or join copy.

### 2.10 Join / create modals

- **Create:** name input; `onCreate` loads profile → `createGroup({ name }, uid, profile)`; errors in modal (“Could not create group.”); clear name + close on success.
- **Join:** mono input, `toUpperCase()` on change; placeholder `AB12CD34`; helper: “Enter the 8-character code from your group leader.”; submit disabled until `trim().length === 8`; errors in modal; uppercase trim before `joinGroupByInviteCode`.

### 2.11 Home integration (P1)

Shown when **`user` signed in** and **no** library search/filters active (same gate as “My playlists” on web).

1. `listOwnedPlaylists` → **2** cards in “My playlists” (Phase 5 P1).
2. `listGroupsForMember` — on failure **log and continue** (empty groups); store `groups.slice(0, 2)` for name lookup.
3. For each of those groups: `listPlaylistsForGroup(id, { limit: 2 })` (per-group errors → `[]`).
4. `groupSessions = flat(...).slice(0, 2)` — **at most two** group playlist cards on home (not 2 per group).
5. Build `playlistPreviews` for `owned + groupSessions` combined slice **(0, 4)** — up to 4 playlists get 3-line song previews via `listSessionSongs`.
6. **Group playlists** section: `PlaylistPreviewCard` with subtitle `{groupName} · {songCount} songs` when `session.groupId` matches a loaded group.
7. Empty copy + link to `/groups`. Section header **Group playlists**, see-all → `/groups`.

**Note:** `myGroups` on home is not a full groups list UI — only aids subtitles; full list remains `/groups`.

### 2.12 Group playlists vs personal playlists

- `listPlaylistsForUser` (Phase 5) does **not** include `groupId` playlists — group sets appear under group detail + home section only.
- Creating a playlist from `/playlists/new` does **not** set `groupId` — group playlists are created from **group detail** (`+ New playlist`) only (web).

### 2.13 `createSession` + `incrementGroupPlaylistCount`

Order on web: `createSession(..., groupId)` then `incrementGroupPlaylistCount(group.id)` then refresh. If create throws, do not increment. Title template: `` `${group.name} set list` ``; `status: 'draft'`; `serviceType: 'sunday_morning'`; `date: new Date()`.

### 2.14 Access denied UX

- **Group detail:** if `getGroup` fails (non-member / missing), show “Could not load group.” or “Group not found.” — web does not expose invite-only preview without join.
- **Member-only read:** rules require `uid in memberIds` — user must join before detail loads.

### 2.15 Offline (Phase 6)

Group playlists are normal `sessions` — **Cache for offline** on playlist detail (Phase 6) works for group members with `canView`. No separate group download.

---

## 3. Polish: share playlist by @username (v1.1)

Port `sharePlaylistByUsername` from `sessions.ts` (deferred Phase 5):

- Owner only; `validateUsername`; `resolveUsernameToUid`; `arrayUnion` on `sharedWith` + `sharedMembers`.
- Wire into `SharePlaylistModal` / sheet — show “Or add by username” form (web parity).
- Errors (port exact web strings where applicable): not found (`No user @…`), already shared, cannot share with yourself, only owner can share.
- Requires invitee to have claimed **username** in profile (same as playlist share on web).

---

## 4. Dependencies (`pubspec.yaml`)

No new packages required for groups core (reuse `cloud_firestore`, `flutter_riverpod`, `go_router`).

Optional polish:

```yaml
  firebase_crashlytics: # v1.1 optional
```

---

## 5. Architecture (Flutter)

### 5.1 Folder layout

```
mobile/lib/
  data/
    group_repository.dart          # port groups.ts
  domain/
    group_member.dart              # GroupMemberInfo mapping if needed
  features/groups/
    groups_screen.dart
    group_detail_screen.dart
    widgets/
      create_group_sheet.dart
      join_group_sheet.dart
  features/playlists/
    share_playlist_sheet.dart      # + username share (7G)
  features/library/
    home_screen.dart               # group playlists section (7F)
```

### 5.2 Riverpod (sketch)

| Provider | Role |
|----------|------|
| `groupsListProvider` | `listGroupsForMember(uid)` |
| `groupDetailProvider(id)` | `getGroup` + `listPlaylistsForGroup` |
| `groupActionsController` | create, join, invite, delete, create playlist |

### 5.3 Routing

| Route | Auth | Notes |
|-------|------|--------|
| `/groups` | Yes + username | List |
| `/groups/:id` | Yes | Firestore read = member only; failed load → error state |

---

## 6. Sub-phases (implementation order)

### Phase 7A — Repository + rules tests (2–3 days)

- [ ] Port `groups.ts` (create, join, invite, delete, helpers, increment count).
- [ ] Unit tests: invite code length, idempotent join, `isGroupOwner` / `isGroupMember`.

### Phase 7B — List + modals (2–3 days)

- [ ] `groups_screen.dart`, create/join sheets.
- [ ] Firestore index documented for `memberIds` + `name`.

### Phase 7C — Group detail (3–4 days)

- [ ] Members, invite code copy, owner username invite.
- [ ] Group playlists + create playlist flow.
- [ ] Delete group confirm + cascade.

### Phase 7D — Playlist integration (1–2 days)

- [ ] Verify group playlists open in Phase 5 detail for all members.
- [ ] `groupId` on `createSession` from group detail only (not general create flow unless product wants).

### Phase 7E — Home group section (1–2 days, P1)

- [ ] “Group playlists” section on `/home` (max 2 cards, preview lines, group name subtitle).
- [ ] Gate home sections: signed-in, no active library search/filters.

### Phase 7F — Shell & QA (2 days)

- [ ] Nav tab (add `/groups` to shell if not in Phase 1); two-account join test; non-member cannot open detail.
- [ ] Member creates group playlist; both open; group owner can delete group playlist (rules).
- [ ] Delete group removes all group playlists + invite code doc.

### Phase 7G — Polish buffer (optional, 2–3 days)

- [ ] `sharePlaylistByUsername` in share sheet.
- [ ] Recent songs UI polish.
- [ ] Crashlytics wiring / chart golden expansion per roadmap.

---

## 7. Testing plan

| Layer | What |
|-------|------|
| Unit | Join code normalize; idempotent join; username validation errors |
| Rules | Emulator test: `isGroupJoinUpdate` accept/reject (if emulator suite exists) |
| Widget | Groups empty state; join modal error |
| Manual | Create → copy code → second user join → see shared group → new playlist → both open |

**Web reference tests:** `playlistMembers.test.ts`; groups covered in integration/rules tests.

---

## 8. Definition of done (Phase 7 core)

- [ ] User can create a group and see it in the list.
- [ ] Second user can join with 8-char code; idempotent re-join works.
- [ ] Group detail shows members, invite code, playlists.
- [ ] Member can create group playlist and open it (Phase 5).
- [ ] Owner can invite by @username; non-owner cannot.
- [ ] Owner can delete group; playlists and invite doc removed.
- [ ] **P1:** Home shows up to **2** group playlist preview cards (correct flatten/slice).
- [ ] Join modal enforces 8-character code before submit.
- [ ] `incrementGroupPlaylistCount` only after successful `createSession` with `groupId`.
- [ ] Roadmap Phase 7 groups marked complete.

---

## 9. Roadmap & matrix traceability

| Roadmap / matrix item | Section |
|-----------------------|---------|
| Groups list / join / group playlists | §2.2–2.7, 7A–7D |
| `listPlaylistsForGroup` | §2.6 |
| `isGroupJoinUpdate` risk | §2.8 |
| Matrix v1.1 groups | Entire doc |
| Share by @username v1.1 | §3, 7G |
| Home group playlists | §2.11, 7E |
| Map §3.7 `resolveUsernameToUid` | §2.5, §3 |
| Phase 6 offline on group sets | §2.15 |
| Group vs personal playlist create | §2.12 |

---

## 10. Web file → Flutter port map

| Web file | Flutter target |
|----------|----------------|
| `lib/firestore/groups.ts` | `group_repository.dart` |
| `lib/firestore/sessions.ts` (`listPlaylistsForGroup`, `createSession`+`groupId`, `deleteSession` options) | `session_repository.dart` (extend Phase 5) |
| `lib/firestore/users.ts` (`resolveUsernameToUid`, `getUserProfile`) | profile / user repository |
| `lib/validation.ts` | `validation.dart` (username) |
| `app/(app)/groups/page.tsx` | `groups_screen.dart` |
| `app/(app)/groups/[id]/page.tsx` | `group_detail_screen.dart` |
| `components/CreateGroupModal.tsx` | `create_group_sheet.dart` |
| `components/JoinGroupModal.tsx` | `join_group_sheet.dart` |
| `components/MemberPills.tsx` | reuse from Phase 5 or shared widget |
| `components/PlaylistCard.tsx` | reuse `playlist_card.dart` |
| `components/HomePage.tsx` (group sections) | `home_screen.dart` |
| `components/PlaylistPreviewCard.tsx` | home playlist preview widget (Phase 5/7) |
| `firestore.rules` (`groups`, `groupInviteCodes`, `isGroupJoinUpdate`) | Contract for client writes |

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| `isGroupJoinUpdate` rejects join payload | Match web `updateDoc` fields; only `arrayUnion` + `updatedAt` |
| Missing Firestore index | Ship `firestore.indexes.json` parity; catch query errors |
| `members` / `memberIds` out of sync | Always update both in same write (web pattern) |
| Duplicate invite codes | Low probability; web has no retry — accept same risk |
| Group playlist count drift | Use `incrementGroupPlaylistCount` on create; delete uses cascade not decrement per playlist |
| Username invite without claimed username | Same error as web — user must claim in profile |
| Home group name missing on card | Only first 2 groups kept for `groupId` → name map; matches web |
| `createSession` succeeds, increment fails | Rare; refresh may show wrong count — retry refresh; web same pattern |
| Owner `updateDoc` too broad | Only port web fields; do not expose rename in UI |

---

## 12. What comes next (not Phase 7 gaps)

| Item | Phase |
|------|--------|
| Play Store, signing, App Links | 8 |
| App Check enforcement | 9 (with web) |
| iOS TestFlight → App Store | 8 doc, **9 execute** |
| Admin tooling | Never mobile |

---

## 13. After Phase 7

- **Phase 8:** [`flutter-phase-8-release.md`](flutter-phase-8-release.md) — beta hardening, Play Store, iOS prep.
- **Phase 9:** [`flutter-phase-9-production.md`](flutter-phase-9-production.md) — production launch, iOS ship, Crashlytics, App Check enforce.
- **Phase 5:** Enable username share in share sheet when 7G ships.

---

*End of Phase 7 plan.*
