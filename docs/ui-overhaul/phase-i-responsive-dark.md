# Phase I — Responsive Polish & Dark Mode

**Prerequisite:** Phases A–H (all screens exist)  
**Outcome:** Every screen audited at 320, 390, 768, 1280px in light + dark.

---

## Tickets

### I-01 — Dark mode pass: shell
**Files:** `AppShell.tsx`, `lf-theme.css`  
**Accept:** Sidebar + main readable; contrast AA.

### I-02 — Dark mode pass: home
**Files:** `HomePage.tsx`, cards  
**Accept:** Song rows, playlist cards styled.

### I-03 — Dark mode pass: song view
**Files:** song page, chart CSS  
**Accept:** Blue chords visible; cream → dark bg; stage mode still works.

### I-04 — Dark mode pass: playlists + groups
**Files:** playlist/group pages  
**Accept:** Cards use `--lf-bg-elevated`.

### I-05 — Dark mode pass: admin + login
**Files:** admin, login  
**Accept:** Stat cards + form inputs readable.

### I-06 — Mobile home
**Files:** `HomePage.tsx`  
**Do:** Single column; search sticky optional.  
**Accept:** 320px no horizontal scroll.

### I-07 — Mobile playlist detail
**Files:** playlist detail  
**Do:** Rows min 56px; key badge visible.  
**Accept:** Tap targets ≥44px.

### I-08 — Tablet split sidebar
**Files:** `AppShell.tsx`  
**Do:** 768–1023: icon-only sidebar OR drawer per design system.  
**Accept:** More chart width on song view.

### I-09 — Landscape phone song view
**Files:** song page  
**Do:** Toolbar single row; maximize chart `dvh`.  
**Accept:** Usable on iPhone landscape.

### I-10 — QA checklist doc
**Files:** `docs/ui-overhaul/responsive-qa-checklist.md`  
**Do:** Matrix of routes × breakpoints × themes with pass/fail boxes.  
**Accept:** Used before release.

---

## Phase I acceptance

- [ ] All routes pass responsive QA checklist
- [ ] Dark mode complete except stage performance theme
- [ ] No lyric clipping at any breakpoint
