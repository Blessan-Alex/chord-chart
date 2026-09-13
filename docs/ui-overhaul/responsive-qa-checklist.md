# Responsive & theme QA checklist

Use before release. Test each cell in **light** and **dark** (Profile → Appearance).

Breakpoints: **320**, **390**, **768**, **1280** px width.

**Legend:** ✅ code review pass · ⚠️ partial · ❌ fail · 🔲 needs manual browser check

| Route | 320 | 390 | 768 | 1280 | Light | Dark | Notes |
|-------|-----|-----|-----|------|-------|------|-------|
| `/` Home | 🔲 | 🔲 | 🔲 | 🔲 | ✅ | ✅ | `overflow-x-clip`; search `min-h-12` |
| `/playlists` | 🔲 | 🔲 | 🔲 | 🔲 | ✅ | ✅ | Full-width cards; shared drafts section added |
| `/playlists/[id]` | 🔲 | 🔲 | 🔲 | 🔲 | ✅ | ✅ | Rows `min-h-14`; key badge always visible |
| `/groups` | 🔲 | 🔲 | 🔲 | 🔲 | ✅ | ✅ | Join/Create in header |
| `/groups/[id]` | 🔲 | 🔲 | 🔲 | 🔲 | ✅ | ✅ | `MemberPills` uses `flex-wrap` |
| `/song/[id]` | 🔲 | 🔲 | 🔲 | 🔲 | ✅ | ✅ | Chart vars sync with `data-theme`; landscape `dvh` |
| `/song/[id]` landscape phone | 🔲 | — | — | — | ✅ | ✅ | `max-height: calc(100dvh - 7rem)` |
| `/song/[id]/edit` | 🔲 | 🔲 | 🔲 | 🔲 | ✅ | ✅ | Selection styles in `globals.css` |
| `/admin` | 🔲 | 🔲 | 🔲 | 🔲 | ✅ | ✅ | Edit/Delete always visible (fixed hover-only) |
| `/login` | 🔲 | 🔲 | 🔲 | 🔲 | ✅ | ✅ | Uses `lf-*` tokens |
| `/profile` | 🔲 | 🔲 | 🔲 | 🔲 | ✅ | ✅ | Theme toggle writes `data-theme` |

## Shell

| Check | Pass |
|-------|------|
| Mobile drawer opens/closes (≤767px) | 🔲 manual |
| Tablet icon-only sidebar (768–1023px) | ✅ code |
| Full sidebar with labels (≥1024px) | ✅ code |
| Sidebar + main contrast (WCAG AA) | 🔲 manual (tokens present) |
| No nested `<main>` (AppShell uses `div`) | ✅ fixed |

## Song chart themes

| Theme | Pass |
|-------|------|
| App light + chart default | ✅ |
| App dark + chart default | ✅ (`data-theme="dark"` + chart vars) |
| Performance stage (`data-chart-theme=stage`) | ✅ |

## Known gaps (post-audit)

- `listPlaylistsForUser` still fetches all published playlists (intentional band catalog).
- Admin stats use full collection scans (fine for small libraries).
- `groupInviteCodes` readable by any signed-in user (rules hardening deferred).
- Firestore types still named `Session` while UI says Playlist (rename deferred).

## Sign-off

- Tester: _______________
- Date: _______________
- Build / commit: _______________
