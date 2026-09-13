# Screen Audit — Reference Mockups

Per-image breakdown: layout, components, interactions, gaps vs current app, implementation notes.

---

## `login.png` — Sign in

**Layout:** Centered card on cream bg; logo + tagline; email/password; black Sign in; Forgot password; demo accounts list.

**Components:** Logo tile, form inputs (rounded 12px), primary button, demo user rows with avatar initials + role badge (user/admin).

**Map to LF Chords:**
- Replace current `/login` with this layout
- Firebase email/password (keep); demo list **dev-only** behind `NODE_ENV`
- Remove demo in production

**Gap:** No username on login yet → Phase B adds `@username` at signup.

**Tickets:** B-01, B-02

---

## `home.png` — Home (list)

**Layout:** Sidebar + main; top search; "RECENTLY VIEWED" + "ALL SONGS" sections; song rows with note icon, title, artist, key circle.

**Interactions:** Row tap → song view; search filters list; sidebar nav.

**Map:** Replace `HomePage.tsx` content area; keep `useSongSearch` + Firestore index.

**Gap:** No "recently viewed" → Phase C adds `localStorage` or Firestore subcollection.

**Tickets:** C-03, C-04, C-05

---

## `home2.png` — Home (dashboard)

**Layout:** Featured song card (Way Maker); "MY PLAYLISTS" (2 cards); "GROUP PLAYLISTS" (2 cards); See all links.

**Map:** Home below fold or alternate home state when user has playlists/groups.

**Gap:** Group playlists don't exist → Phase G.

**Tickets:** C-06, C-07, G-08

---

## `lyrics.png` — Song view (desktop)

**Layout:** Back + title + artist + heart; toolbar (− Key▾ +, Chords|Numbers, A sizes); Original key chip; VERSE labels with horizontal rule; blue chords above serif lyrics.

**Keep from current app:** Performance mode wrap, bottom bar on mobile, session nav, zoom, stage theme.

**Change UI to match:** Serif lyrics, blue chord color, segmented controls, key modal instead of select.

**Gap:** Heart/favorite optional Phase C stretch.

**Tickets:** D-01 through D-10

---

## `mobile lyris.png` — Song view (mobile)

Same as desktop but stacked toolbar; confirms mobile toolbar order: transpose | toggle | text size.

**Mobile rules:** Toolbar sticky; chart scrolls below; autoscroll bar stacks above performance bar when active.

**Tickets:** D-08, I-03

---

## `oirginalkeykyrics.png` — Select Key modal

**Layout:** Modal 4×3 key grid; selected key blue; Original: G subtitle; X close.

**Map:** Replace `SongToolbar` select + bottom bar key on tap opens this modal.

**Tickets:** D-04, D-05

---

## `playlist.png` — Playlists list

**Layout:** Sidebar; "Playlists" title + black + button; expandable cards with song preview grid.

**Map:** Redesign `/sessions` → `/playlists`; any user creates (not admin-only).

**Gap:** Current sessions admin-only create → Phase F changes rules + UI.

**Tickets:** F-01, F-04, F-05

---

## `playlist2.png` — Playlist detail

**Layout:** Back + title; Edit link; "3 songs"; numbered rows (icon, title, artist, key badge); dashed "Add songs" button.

**Map:** `/playlists/[id]`; keep key override, reorder, offline cache, Start set ▶.

**Keep:** Session navigation query params (`?session=` → rename to `?playlist=`).

**Tickets:** F-06, F-07, F-08

---

## `groups.png` — Groups list

**Layout:** Groups title; Join + Create (+); cards with member count, playlist count, name pills, chevron.

**Map:** New `/groups` route; new Firestore `groups` collection.

**Tickets:** G-01 through G-06

---

## `admin.png` / `admindashboard.png` — Admin

**Layout:** Back + Admin; + Add song; 3 stat cards (songs, playlists, groups); search; song list with Edit/Delete on hover.

**Map:** New `/admin` page; gate with `isAdmin`; wire to existing song CRUD.

**Security:** Delete/edit **only here** for non-admin users (rules Phase J).

**Tickets:** H-01 through H-08

---

## `edit song.png` — Edit song (admin)

**Layout:** Title, Artist, Original key grid, monospace lyrics/chords textarea, Save.

**Map:** Redesign `/song/[id]/edit`; Phase E replaces click-word with highlight placement.

**Gap:** Current `InteractiveEditor` is word-click → Phase E overhaul.

**Tickets:** E-01 through E-09, H-06

---

## `autoscroll.jpeg` — Autoscroll speed bar (UG reference)

**Take only:** Bottom bar with − | **1.0x** | + | pause | close.

**Do not take:** UG green palette, chord diagrams row, PDF/Listen buttons, tuning metadata.

**Behavior:**
- Speed range **0.5x–2.0x**, step **0.1**, default **1.0x**
- Pause stops `scrollTop` animation; close hides bar
- Persist speed in `localStorage` key `lf-autoscroll-speed`
- Respect `prefers-reduced-motion` → disable autoscroll

**Tickets:** D-11, D-12

---

## Feature matrix: mockup vs current app

| Feature | In mockup | In app today | Phase |
|---------|-----------|--------------|-------|
| Transpose ± | ✓ | ✓ | D (restyle) |
| Chords/Numbers | ✓ | ✓ | D |
| Text zoom | ✓ (A icons) | ✓ (A−/A+) | D |
| Pinch zoom | ✗ | ✓ | Keep (mobile) |
| Performance wrap | ✗ | ✓ | Keep |
| Session/playlist nav | ✗ | ✓ | F (rename) |
| Offline cache | ✗ | ✓ | F (restyle button) |
| Autoscroll | ✓ | ✗ | D |
| User playlists | ✓ | Admin only | F |
| Groups | ✓ | ✗ | G |
| Username | ✗ | displayName only | B |
| Highlight chords | ✗ | Word click | E |
| Admin stats | ✓ | Partial | H |
| Dark mode | ✗ | Partial (stage) | I |
