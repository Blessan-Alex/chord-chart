# UI/UX audit — musician on stage

Photos in this folder drive each pass. Goal: **one purpose per element**, **thumb reach**, **high contrast**, **no duplicate labels**.

## Photo checklist

| Photo | Issues | Fixes |
|-------|--------|-------|
| `sidebar.jpeg` | Drawer too wide; icons only (no labels); icons clipped left | ✅ Labels in drawer; narrower drawer (`84vw` max); scrollable sidebar body |
| `home.jpeg` | "Home" twice (top bar + page) | ✅ Top bar shows logo only on `/`; page leads with search |
| `lyrics.jpeg` | Title misaligned; duplicate key row; Auto scroll broken; pinch vs scroll | ✅ Header alignment; hide key row on mobile; full-screen autoscroll; pinch off when scrolling; movement guard on double-tap |
| `playlist.jpeg` | "Playlists" ×3; redundant ← Home | ✅ Shell title only; removed page h1 and back link |
| `paste lyrics.jpeg` | Dark inputs, low contrast, cluttered steps | ✅ LF theme inputs; step pills; shorter copy |
| `place chords.jpeg` | Desktop-only `/` hint; small tap targets; save hard to reach | ✅ Mobile-first instructions; sticky save; larger chord grid |
| `place chords2.jpeg` | Bottom sheet cramped; unclear actions | ✅ Shorter labels; backdrop dismiss; 48px buttons |

## Principles (live performance)

1. **One control, one job** — no duplicate nav (sidebar + page title + back link).
2. **48px minimum touch targets** — bottom bar for song controls on mobile.
3. **Autoscroll = performance mode** — full viewport, slow scroll, pinch off while active.
4. **Scan in 1 second** — section labels visible; song title one line; chords high contrast.
5. **Fail quiet** — errors don’t block the chart.

## Product & sharing

See **`docs/chords/04-sharing-and-roles.md`** for roles (admin vs musician), private playlists, WhatsApp-style share links, and phased implementation.

## Remaining (later)

- ~~Guest banner shorter on home~~
- ~~Playlist cards: larger tap area, less metadata~~
- ~~Stage theme default when opened from playlist~~
