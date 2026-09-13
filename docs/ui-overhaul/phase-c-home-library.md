# Phase C — Home & Library UI

**Prerequisite:** Phase A, B  
**Outcome:** Home matches `home.png` / `home2.png`; search + recently viewed.

---

## Tickets

### C-01 — Home layout with sections
**Files:** `webmvp/src/components/HomePage.tsx`  
**Do:** RECENTLY VIEWED + ALL SONGS headers; "See all" links optional.  
**Accept:** Matches `home.png` hierarchy.

### C-02 — `SongRow` component
**Files:** `webmvp/src/components/SongRow.tsx`  
**Do:** Icon well, title, artist, key circle badge per design system.  
**Accept:** Row height ≥64px; key badge matches mockup.

### C-03 — Recently viewed tracking
**Files:** `webmvp/src/lib/recentSongs.ts`, hook `useRecentSongs.ts`  
**Do:** On song page mount, push to localStorage max 10.  
**Accept:** Re-open song → appears in Recently Viewed.

### C-04 — Recently viewed section
**Files:** `HomePage.tsx`  
**Do:** Render recent rows above All Songs; hide if empty.  
**Accept:** Matches mockup when items exist.

### C-05 — Search bar restyle
**Files:** `HomePage.tsx`  
**Do:** Full-width search input per mockup (icon left, 48px height).  
**Accept:** `useSongSearch` behavior unchanged.

### C-06 — My Playlists preview section
**Files:** `HomePage.tsx`, `PlaylistPreviewCard.tsx`  
**Do:** Fetch user's playlists (top 2); card with preview grid per `home2.png`.  
**Accept:** Shows title + song count + chevron.

### C-07 — Group playlists preview section
**Files:** `HomePage.tsx`  
**Do:** Placeholder "No group playlists yet" until Phase G; layout ready.  
**Accept:** Section renders without errors when empty.

### C-08 — Artist field on songs
**Files:** Ensure `SongIndexEntry.artist` displays in rows  
**Do:** Fall back to empty string if missing.  
**Accept:** Rows show artist like mockup when data exists.

### C-09 — Admin home link
**Files:** `AppShell.tsx`  
**Do:** Admin nav item visible only if `isAdmin`.  
**Accept:** Non-admin does not see Admin.

---

## Phase C acceptance

- [ ] Home visually matches mockups at desktop + mobile
- [ ] Search + library browse unchanged functionally
- [ ] Recently viewed works
