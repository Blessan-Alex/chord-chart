# Responsive & Dark Mode QA Checklist

Use after Phase I. Mark pass/fail per cell.

## Breakpoints

- **320** — iPhone SE
- **390** — iPhone 14
- **768** — iPad portrait
- **1280** — Laptop

## Themes

- **Light** — default
- **Dark** — `data-theme=dark`
- **Stage** — song view only (`data-chart-theme=stage`)

---

## Routes

| Route | 320 L | 390 L | 768 L | 1280 L | 390 D | Notes |
|-------|-------|-------|-------|--------|-------|-------|
| /login | | | | | | |
| /signup | | | | | | |
| / | | | | | | |
| /song/[id] | | | | | | No lyric clip |
| /song/[id] edit | | | | | | Admin only |
| /playlists | | | | | | |
| /playlists/[id] | | | | | | |
| /groups | | | | | | |
| /groups/[id] | | | | | | |
| /admin | | | | | | Admin only |
| /profile | | | | | | |

## Song view specific

- [ ] Long lyric line fully visible (no right clip)
- [ ] Autoscroll bar 44px targets
- [ ] Key modal grid tappable
- [ ] Bottom bar not hiding last line
- [ ] Pinch zoom works
- [ ] Playlist ◀ ▶ when `?playlist=`

## Accessibility

- [ ] Focus visible on all buttons
- [ ] Contrast AA on chord text
- [ ] `prefers-reduced-motion` disables autoscroll
