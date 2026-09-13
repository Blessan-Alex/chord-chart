# Design System — LF Chords (from UI overhaul mockups)

Based on `docs/ui-overhaul/*.png`. Adapted for **LF Chords** (church/worship band context).

---

## 1. Brand

| Token | Value |
|-------|--------|
| App name | **LF Chords** |
| Tagline | *For musicians and worship teams* |
| Logo | Rounded square **48×48**, blue fill, white eighth-note icon |

---

## 2. Color palette — Light mode

### Surfaces

| Token | Hex | Usage |
|-------|-----|--------|
| `--lf-bg-page` | `#FAF9F6` | Main content background (warm cream) |
| `--lf-bg-sidebar` | `#FFFFFF` | Sidebar, cards |
| `--lf-bg-elevated` | `#FFFFFF` | Cards, modals, inputs |
| `--lf-bg-muted` | `#F3F1EC` | Icon wells, inactive toggles |
| `--lf-bg-active` | `#E8F0FE` | Active nav item, key badge bg |

### Text

| Token | Hex | Usage |
|-------|-----|--------|
| `--lf-text-primary` | `#1A1A1A` | Titles, lyrics (sans contexts) |
| `--lf-text-secondary` | `#6B7280` | Artist, metadata, section labels |
| `--lf-text-tertiary` | `#9CA3AF` | Placeholders, hints |
| `--lf-text-inverse` | `#FFFFFF` | Text on primary buttons |

### Brand & accents

| Token | Hex | Usage |
|-------|-----|--------|
| `--lf-brand` | `#4A7BF7` | Logo, links, **chord text**, active accents |
| `--lf-brand-hover` | `#3A6AE6` | Hover states |
| `--lf-brand-soft` | `#E8F0FE` | Selected key, nav active bg |

### Actions

| Token | Hex | Usage |
|-------|-----|--------|
| `--lf-action-primary` | `#1A1A1A` | Primary buttons (Sign in, Add song, +) |
| `--lf-action-primary-hover` | `#333333` | |
| `--lf-danger` | `#DC2626` | Delete text |
| `--lf-danger-bg` | `#FEE2E2` | Delete button bg |

### Borders

| Token | Hex |
|-------|-----|
| `--lf-border` | `#E5E7EB` |
| `--lf-border-strong` | `#D1D5DB` |

---

## 3. Color palette — Dark mode

| Token | Light → Dark |
|-------|----------------|
| `--lf-bg-page` | `#FAF9F6` → `#0F1115` |
| `--lf-bg-sidebar` | `#FFFFFF` → `#161920` |
| `--lf-bg-elevated` | `#FFFFFF` → `#1C2028` |
| `--lf-bg-muted` | `#F3F1EC` → `#252A33` |
| `--lf-bg-active` | `#E8F0FE` → `#1E3A5F` |
| `--lf-text-primary` | `#1A1A1A` → `#F3F4F6` |
| `--lf-text-secondary` | `#6B7280` → `#9CA3AF` |
| `--lf-brand` | `#4A7BF7` → `#6B9AFF` (chords stay high contrast) |
| `--lf-action-primary` | `#1A1A1A` → `#F3F4F6` (invert: dark bg buttons become light) |
| `--lf-border` | `#E5E7EB` → `#2D3340` |

**Stage mode (performance):** keep existing `--chart-theme=stage` (black bg, yellow chords) as a third theme option on song view only.

---

## 4. Typography

### Font families

| Role | Font | Fallback |
|------|------|----------|
| **UI / sans** | `Geist Sans` (already in project) | `system-ui, sans-serif` |
| **Lyrics / serif** | `Lora` or `Source Serif 4` | `Georgia, serif` |
| **Chords / mono** | `Geist Mono` | `"Courier New", monospace` |

> Mockups use **serif for lyrics**, **blue sans for chords**. UI chrome is sans.

### Scale

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `--lf-text-xs` | 11px | 500 | Section caps (VERSE 1), admin labels |
| `--lf-text-sm` | 13px | 400 | Metadata, artist |
| `--lf-text-base` | 15px | 400 | Body, list rows |
| `--lf-text-lg` | 18px | 600 | Page titles |
| `--lf-text-xl` | 22px | 600 | Song title (mobile header) |
| `--lf-text-2xl` | 28px | 700 | Stat numbers (admin) |
| `--lf-lyric-base` | 18px | 400 | Lyric lines (performance) |
| `--lf-chord-base` | 16px | 700 | Chord row |

Line height: lyrics **1.55**, UI **1.4**.

---

## 5. Spacing & radius

| Token | Value |
|-------|--------|
| `--lf-radius-sm` | 8px |
| `--lf-radius-md` | 12px |
| `--lf-radius-lg` | 16px |
| `--lf-radius-full` | 9999px |
| `--lf-space-1` | 4px |
| `--lf-space-2` | 8px |
| `--lf-space-3` | 12px |
| `--lf-space-4` | 16px |
| `--lf-space-6` | 24px |
| `--lf-space-8` | 32px |

**Sidebar width:** 240px desktop; drawer overlay on mobile.

**Content max-width:** 720px for song view; 960px for lists.

---

## 6. Component specs

### Sidebar nav item

- Height **44px**, icon 20px + label 15px
- Active: `--lf-bg-active` pill, `--lf-brand` icon + text
- Inactive: transparent, `--lf-text-secondary`

### Search input

- Height **48px**, full width, `--lf-bg-elevated`, border `--lf-border`
- Left icon 20px, placeholder `--lf-text-tertiary`
- Radius `--lf-radius-md`

### Song row (home / admin)

- Min height **64px**, padding `--lf-space-4`
- Left: 40×40 icon well (`--lf-bg-muted`) + note icon
- Center: title bold + artist secondary
- Right: key badge — circle 32px, `--lf-bg-active`, `--lf-brand` text

### Playlist card

- White card, `--lf-radius-lg`, padding `--lf-space-4`
- Header row: list icon + title + song count + chevron
- Preview grid: 2–3 columns of title/artist (truncate)

### Segmented control (Chords | Numbers)

- Container: `--lf-bg-muted`, radius full, padding 2px
- Active segment: white bg, subtle shadow
- Height **36px** min

### Transpose cluster

- Three buttons: `−` | **Key** ▾ | `+`
- Each **40×40** min, border `--lf-border`, radius sm

### Text size cluster (A− A A+)

- Three **A** icons; active = black square bg, white A (per mockup)

### Key select modal

- Overlay blur, modal `--lf-radius-lg`, max-width 360px
- Title "Select Key", subtitle "Original: G"
- 4×3 grid of key buttons; selected = `--lf-brand` fill, white text

### Autoscroll bar (from `autoscroll.jpeg` — speed only)

- Fixed bottom, height **56px** + safe area
- Left: close **X** (44×44)
- Center: pill `−` | **1.0x** | `+` (speed 0.5–2.0, step 0.1)
- Right: pause **‖** (44×44)
- Colors: use `--lf-brand` for primary buttons; do **not** copy Ultimate Guitar green

### Highlight chord selection (editor — Phase E)

- Selection: `--lf-brand-soft` background, `--lf-brand` underline
- Handles on mobile: long-press → selection handles; desktop: click-drag
- Placed chord: floats above selection start index

---

## 7. Layout breakpoints

| Name | Width | Layout |
|------|-------|--------|
| `mobile` | 0–767px | No sidebar; bottom nav or hamburger; full-bleed song |
| `tablet` | 768–1023px | Collapsible sidebar OR narrow persistent sidebar |
| `desktop` | 1024px+ | Fixed 240px sidebar + main |

---

## 8. CSS implementation notes

- Add `src/app/lf-theme.css` with `:root` and `[data-theme="dark"]` tokens.
- Tailwind v4: map tokens in `@theme inline { --color-lf-brand: var(--lf-brand); ... }`
- Toggle: `document.documentElement.dataset.theme = 'dark' | 'light'`
- Do not remove performance/chart CSS variables; extend them.

---

## 9. Accessibility

- Contrast: chord blue on cream ≥ **4.5:1**; stage mode ≥ **7:1**
- Touch targets: **44×44** minimum everywhere
- Focus rings: 2px `--lf-brand` offset 2px
- `aria-live` on transpose key and autoscroll speed
