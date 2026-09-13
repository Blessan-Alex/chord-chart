# Phase H — Admin Dashboard

**Prerequisite:** Phase A, F (playlist count), G (group count)  
**Outcome:** Admin page matches `admin.png`; only admin edits/deletes songs.

---

## Tickets

### H-01 — Admin route + gate
**Files:** `app/admin/page.tsx`  
**Do:** Redirect non-admin to home; match layout with back + Admin title.  
**Accept:** Musician gets 403 or redirect.

### H-02 — Stat cards
**Files:** `AdminStats.tsx`  
**Do:** Total songs, Playlists, Groups — 3 cards per mockup.  
**Accept:** Numbers match Firestore counts.

### H-03 — Admin song search
**Files:** `admin/page.tsx`  
**Do:** Search input filters list client-side or via index.  
**Accept:** Typing filters visible rows.

### H-04 — Admin song list rows
**Files:** `AdminSongRow.tsx`  
**Do:** Title bold; "Artist · Key of G" secondary; Edit + Delete on hover/always mobile.  
**Accept:** Matches `admin.png` rows.

### H-05 — Edit navigates to edit page
**Files:** admin list  
**Do:** Edit → `/song/[id]/edit`.  
**Accept:** Existing edit flow opens.

### H-06 — Delete with confirm
**Files:** admin list  
**Do:** ConfirmDialog; calls `archiveSong`.  
**Accept:** Non-admin cannot call delete (rules + UI hidden).

### H-07 — + Add song button
**Files:** admin header  
**Do:** Black pill button → `/import` or new song form.  
**Accept:** Matches mockup placement.

### H-08 — Remove admin actions from musician song view
**Files:** `SongToolbar.tsx`, song page  
**Do:** Edit/Delete/+Playlist only in ⋯ for admin OR remove from song view entirely (admin uses dashboard).  
**Accept:** Musician never sees Delete on song page.

---

## Phase H acceptance

- [ ] Admin dashboard matches mockup
- [ ] Stats accurate
- [ ] Only admin can edit/delete songs in UI
- [ ] Import/add song path works
