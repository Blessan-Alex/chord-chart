# Responsive & theme QA checklist

Use before release. Test each cell in **light** and **dark** (Profile → Appearance).

Breakpoints: **320**, **390**, **768**, **1280** px width.

| Route | 320 | 390 | 768 | 1280 | Light | Dark | Notes |
|-------|-----|-----|-----|------|-------|------|-------|
| `/` Home | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | No horizontal scroll; search usable |
| `/playlists` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Cards full width on mobile |
| `/playlists/[id]` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Rows ≥56px; key badge visible |
| `/groups` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Join/Create in header |
| `/groups/[id]` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Member pills wrap |
| `/song/[id]` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Chords readable; no lyric clip |
| `/song/[id]` landscape phone | ☐ | — | — | — | ☐ | ☐ | Chart uses max `dvh` |
| `/song/[id]/edit` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Editor selection works |
| `/admin` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Stats + row actions |
| `/login` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Form inputs readable |
| `/profile` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Theme toggle applies |

## Shell

| Check | Pass |
|-------|------|
| Mobile drawer opens/closes (≤767px) | ☐ |
| Tablet icon-only sidebar (768–1023px) | ☐ |
| Full sidebar with labels (≥1024px) | ☐ |
| Sidebar + main contrast (WCAG AA) | ☐ |

## Song chart themes

| Theme | Pass |
|-------|------|
| App light + chart default | ☐ |
| App dark + chart default | ☐ |
| Performance stage (`data-chart-theme=stage`) | ☐ |

## Sign-off

- Tester: _______________
- Date: _______________
- Build / commit: _______________
