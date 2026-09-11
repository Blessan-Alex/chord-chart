---
id: webmvp-009
title: Mobile-responsive layout (phone-first polish)
status: closed
type: prototype
labels: [webmvp, prototype, ui, mobile]
blocked_by: [webmvp-008]
blocks: []
---

## Goal

Make the entire web MVP usable and readable on phones (320px–430px width). Musicians will use this on stage/rehearsal on mobile — no horizontal scroll, touch-friendly controls, readable chord rows.

## Scope

Pages/components to update (webmvp/ only):

| File | Mobile fixes |
|---|---|
| `src/app/layout.tsx` | Viewport meta, safe-area, prevent overflow-x |
| `src/components/HomePage.tsx` | Tighter padding, full-width Import button on small screens, tap-friendly list rows |
| `src/app/import/page.tsx` | Stack preset/key controls, 2-col chord grid on phone, larger inputs, full-width Save |
| `src/app/song/[id]/page.tsx` | Sticky key selector, readable title wrap |
| `src/components/ChordLine.tsx` | Mobile chord layout — align chord/degree above lyrics |

## Requirements

### Layout
- [x] No horizontal scroll at 375px width (iPhone SE / standard phone)
- [x] Page padding: `p-4` on mobile, `p-8` on `sm+`
- [x] `max-w-*` containers centered; content never wider than viewport

### Touch / UX
- [x] Buttons and list rows min height ~44px (Apple touch target)
- [x] Inputs and selects min height ~44px, font size ≥16px on inputs (prevents iOS zoom-on-focus)
- [x] Primary actions full-width on mobile (`w-full sm:w-auto`)

### Song / chord display (most important)
- [x] On mobile: each lyric word + chord + degree stacks in a row or 2×2 grid per line — chords clearly readable
- [x] Long song titles wrap, don't overflow
- [x] Key picker easy to reach (top of song view, full width)

### Technical
- [x] Add viewport export in layout if missing
- [x] Optional: `viewport-fit=cover` + safe-area padding for notched devices
- [x] `npm run build` passes
- [x] No logic changes to engine/storage — UI/CSS only

## Test manually

Use Chrome DevTools → iPhone 14 / Pixel 7 (375×812) and real phone if possible:

1. `/` — list + Import button usable one-handed
2. `/import` — enter 8 chords without zoom/scroll issues
3. `/song/[id]` — change key, read C/G/D transpose matrix clearly

## Out of scope

- PWA / install prompt
- Native app wrapper
- Dark mode redesign
- New features

## Acceptance criteria

- [x] All 3 routes usable at 375px width
- [x] No horizontal overflow
- [x] Touch targets feel comfortable on phone
- [x] Chord + degree + lyrics readable without pinch-zoom

## Resolution

Phone-first UI polish across all routes. Added `viewport` export with `viewport-fit=cover`, safe-area insets, and `overflow-x-hidden` on html/body. All pages use `p-4 sm:p-8`, `w-full max-w-*`, 44px touch targets, and `text-base` inputs. Home: full-width Import on mobile, tappable list rows. Import: stacked controls, full-width Save. Song view: sticky header with key selector and wrapping title. No engine/storage changes. `npm run build` passes.
