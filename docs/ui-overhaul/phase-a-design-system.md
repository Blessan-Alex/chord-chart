# Phase A — Design System & App Shell

**Prerequisite:** None  
**Outcome:** Global tokens, sidebar layout, dark mode toggle stub, no feature changes.

---

## Tickets

### A-01 — Create `lf-theme.css` tokens
**Files:** `webmvp/src/app/lf-theme.css`, import in `layout.tsx`  
**Do:** Copy tokens from `01-design-system.md` for light + `[data-theme=dark]`.  
**Accept:** DevTools shows `--lf-brand` on `:root`.  
**Do not:** Change component markup yet.

### A-02 — Tailwind theme bridge
**Files:** `webmvp/src/app/globals.css`  
**Do:** Map `--color-lf-*` in `@theme inline`.  
**Accept:** `bg-lf-brand` works in a test div.

### A-03 — Add Lora (lyrics serif)
**Files:** `webmvp/src/app/layout.tsx`  
**Do:** `next/font/google` Lora variable `--font-lora`.  
**Accept:** Font loads without layout shift.

### A-04 — `AppShell` component
**Files:** `webmvp/src/components/AppShell.tsx`  
**Do:** Sidebar 240px: logo, nav links (Home, Playlists, Groups, Profile), Admin section, user footer with initials.  
**Accept:** Renders on a test page; active route highlighted per mockup.

### A-05 — Mobile shell drawer
**Files:** `AppShell.tsx`, `webmvp/src/components/MobileNav.tsx`  
**Do:** <768px: hamburger opens drawer; bottom optional later.  
**Accept:** iPhone width: sidebar hidden, menu opens overlay.

### A-06 — Wrap authenticated routes in AppShell
**Files:** `webmvp/src/app/layout.tsx` or route group `app/(app)/layout.tsx`  
**Do:** Move home, songs, sessions, admin under `(app)` group with shell.  
**Accept:** Login page has no sidebar; home has sidebar.

### A-07 — Theme toggle in Profile stub
**Files:** `webmvp/src/app/profile/page.tsx` (new stub)  
**Do:** Light/Dark switch writes `localStorage lf-theme`.  
**Accept:** Toggling flips `data-theme` on `<html>`.

### A-08 — Logo + app name
**Files:** `AppShell.tsx`, `manifest.webmanifest`  
**Do:** Use "LF Chords" + note icon matching mockup proportions.  
**Accept:** Matches `home.png` sidebar header.

---

## Phase A acceptance (overall)

- [ ] Desktop: sidebar matches mockup structure
- [ ] Mobile: navigable without horizontal scroll
- [ ] Dark mode tokens apply to shell backgrounds
- [ ] All existing routes still load
