# Phase G — Groups

**Prerequisite:** Phase B (username), Phase F (playlists)  
**Outcome:** Groups UI matches `groups.png`; shared group playlists on home.

---

## Tickets

### G-01 — Firestore `groups` module
**Files:** `webmvp/src/lib/firestore/groups.ts`  
**Do:** CRUD: create, join by invite code, list for member.  
**Accept:** Emulator create group.

### G-02 — Groups list page
**Files:** `app/groups/page.tsx`  
**Do:** Match `groups.png`: Join + Create buttons, member pills, chevron.  
**Accept:** Visual match desktop.

### G-03 — Create group modal
**Files:** `CreateGroupModal.tsx`  
**Do:** Name field; generates invite code.  
**Accept:** Owner appears in member list.

### G-04 — Join group flow
**Files:** `JoinGroupModal.tsx`  
**Do:** Enter 8-char code; adds member.  
**Accept:** Group appears in list.

### G-05 — Group detail page
**Files:** `app/groups/[id]/page.tsx`  
**Do:** Members list, group playlists, invite link copy.  
**Accept:** Member can view; owner can manage.

### G-06 — Group playlist link
**Files:** `sessions.ts`, group detail  
**Do:** Create playlist with `groupId` set; show under group.  
**Accept:** `home2.png` GROUP PLAYLISTS section populated.

### G-07 — Member pills component
**Files:** `MemberPills.tsx`  
**Do:** First names or @username truncated + "+N".  
**Accept:** Matches mockup pills.

### G-08 — Home group section wired
**Files:** `HomePage.tsx`  
**Do:** Replace placeholder from C-07.  
**Accept:** Shows real group playlists.

### G-09 — Invite by @username
**Files:** `groups.ts`  
**Do:** Owner invites username → pending or direct add.  
**Accept:** Invitee sees group after accept.

### G-10 — Group rules
**Files:** `firestore.rules`  
**Do:** Member read; owner write; see Phase J.  
**Accept:** Non-member cannot read group doc.

### G-11 — Admin stats: groups count
**Files:** admin dashboard  
**Do:** Count groups collection.  
**Accept:** Stat card shows number.

### G-12 — Mobile groups layout
**Files:** groups pages CSS  
**Do:** Cards full width; Join/Create in header row.  
**Accept:** 320px usable.

---

## Phase G acceptance

- [ ] Create/join group
- [ ] Group playlist visible to members
- [ ] Home shows group playlists
- [ ] Invite flow uses @username
