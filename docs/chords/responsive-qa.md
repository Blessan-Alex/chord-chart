# Responsive QA Checklist

Test on **phone (375px)**, **tablet (768px)**, and **laptop (1280px)** before each release.

## Home `/`
- [ ] Title and nav buttons wrap without horizontal scroll
- [ ] Search + key filter stack on phone, row on tablet+
- [ ] Song list rows are tappable (`min-h-14`)
- [ ] Library cap message shows when >100 songs and not searching

## Song `/song/[id]`
- [ ] Title on first row; controls wrap on second row (phone)
- [ ] Edit / + Session / Delete reachable without overflow
- [ ] Chord chart scrolls horizontally when needed
- [ ] Key select and Chords/Numbers toggle usable with thumb

## Sessions `/sessions`, `/sessions/[id]`
- [ ] Set list readable; reorder controls on admin rows
- [ ] Add-to-session modal slides from bottom on phone

## Login `/login`
- [ ] Form fits narrow viewport; inputs ≥44px tap height

## Offline
- [ ] Amber banner visible when offline; hidden when online after deploy

## PWA
- [ ] Add to Home Screen works on Android (PNG icons)
- [ ] Safe-area padding on notched phones (home indicator)
