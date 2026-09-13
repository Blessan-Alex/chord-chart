# UI Overhaul — Master Overview

> **Goal:** Re-skin LF Chords to match `docs/ui-overhaul/` mockups while **keeping all existing features** and adding playlists-for-all, groups, usernames, highlight-based chord placement, and autoscroll speed control.

**Reference assets:** 13 screens in this folder (see [02-screen-audit.md](./02-screen-audit.md)).

**Implementation rule:** UI/UX changes only per phase unless the phase explicitly includes data model or rules work. No feature removal.

---

## What we are building

| Area | Reference | Our customization |
|------|-----------|-------------------|
| App shell | Sidebar + cream main (`home.png`) | Brand: **LF Chords**; nav: Home, Playlists, Groups, Profile, Admin |
| Login | `login.png` | Firebase auth; demo list optional in dev only |
| Home | `home.png`, `home2.png` | Recently viewed + all songs + playlist previews |
| Song view | `lyrics.png`, `mobile lyris.png` | Keep transpose, numbers, zoom, session nav, performance mode |
| Key picker | `oirginalkeykyrics.png` | Modal replaces mobile `<select>` |
| Playlists | `playlist.png`, `playlist2.png` | Rename **Sessions → Playlists**; any user can create |
| Groups | `groups.png` | Shared band spaces with invites |
| Admin | `admin.png`, `admindashboard.png` | Stats + song list; **only admin** edits/deletes songs |
| Edit song | `edit song.png` | Admin-only; add highlight chord editor in Phase E |
| Autoscroll | `autoscroll.jpeg` | **Speed bar only** (− / 1.0x / + / pause / close) |

---

## Phase map (do in order)

| Phase | Doc | Focus | Est. tickets |
|-------|-----|-------|--------------|
| **A** | [phase-a-design-system.md](./phase-a-design-system.md) | Tokens, fonts, AppShell, dark mode base | 8 |
| **B** | [phase-b-auth-users.md](./phase-b-auth-users.md) | Login UI, username, profile | 10 |
| **C** | [phase-c-home-library.md](./phase-c-home-library.md) | Home + search + recently viewed | 9 |
| **D** | [phase-d-song-view.md](./phase-d-song-view.md) | Song page UI + key modal + autoscroll | 12 |
| **E** | [phase-e-chord-editor.md](./phase-e-chord-editor.md) | Highlight-to-place chords | 11 |
| **F** | [phase-f-playlists.md](./phase-f-playlists.md) | Sessions → Playlists, user CRUD, sharing | 14 |
| **G** | [phase-g-groups.md](./phase-g-groups.md) | Groups, invites, group playlists | 12 |
| **H** | [phase-h-admin.md](./phase-h-admin.md) | Admin dashboard + song management UI | 8 |
| **I** | [phase-i-responsive-dark.md](./phase-i-responsive-dark.md) | Mobile/tablet polish + dark mode pass | 10 |
| **J** | [phase-j-security-rules.md](./phase-j-security-rules.md) | Firestore rules for new permissions | 8 |

**Total:** ~102 small tickets (each sized for a single cheap-model session).

---

## Non-negotiables (carry through every phase)

1. **Existing features stay:** transpose, numbers mode, pinch/button zoom, performance mode, offline cache, session song nav, draft/publish song edits.
2. **Admin-only song library writes:** only `admin` claim may create/update/delete `songs/*` and `songIndex/*`.
3. **Musicians may:** create/edit **their** playlists, set per-song keys in playlists, share playlists/groups.
4. **Responsive:** every screen must work on 320px phone, 768px tablet, and desktop.
5. **Dark mode:** defined in design system; not an afterthought (Phase I completes audit).

---

## Naming migration

| Old | New (UI + routes) |
|-----|-------------------|
| Session | Playlist |
| `/sessions` | `/playlists` (keep redirects from old URLs) |
| `sessions` Firestore collection | Keep collection name in Phase F; alias in UI first, migrate optional later |

---

## How to execute a ticket

Each ticket in phase docs includes:

- **ID** (e.g. `D-07`)
- **Files** (max 3)
- **Do** (bullet steps)
- **Acceptance** (testable)
- **Do not** (scope guard)

Pick one ticket → implement → `npm run test` → visual check at 390px + 1280px → commit.

---

## Related docs

- [01-design-system.md](./01-design-system.md) — colors, type, components
- [02-screen-audit.md](./02-screen-audit.md) — pixel-level notes per mockup
- [03-data-model-changes.md](./03-data-model-changes.md) — Firestore shapes for users, playlists, groups
