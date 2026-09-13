# Phased Plan — Ticket Index

Quick lookup for implementers. Full detail in each `phase-*.md` file.

---

## Execution order

```
A → B → C → D → E → F → J (rules) → G → H → I
```

**Note:** Phase J can run in parallel with F/G once shapes are defined. Phase I must be last.

---

## Ticket count by phase

| Phase | ID range | Tickets | Focus |
|-------|----------|---------|--------|
| A | A-01–A-08 | 8 | Design tokens + AppShell |
| B | B-01–B-10 | 10 | Login + @username |
| C | C-01–C-09 | 9 | Home UI |
| D | D-01–D-13 | 13 | Song view + autoscroll |
| E | E-01–E-11 | 11 | Highlight chord editor |
| F | F-01–F-14 | 14 | Playlists for all users |
| G | G-01–G-12 | 12 | Groups + invites |
| H | H-01–H-08 | 8 | Admin dashboard |
| I | I-01–I-10 | 10 | Dark + responsive QA |
| J | J-01–J-08 | 8 | Security rules |

**Total: 103 tickets**

---

## Cheap-model prompt template

```
Implement ticket {ID} from docs/ui-overhaul/phase-{x}.md

Constraints:
- UI/UX only unless ticket says otherwise
- Max 3 files changed
- Match docs/ui-overhaul/01-design-system.md tokens
- Do not remove existing features
- Run: npm run test && npx tsc --noEmit

Acceptance: copy from ticket
```

---

## Critical path (minimum viable rehaul)

If time-boxed, do these first:

1. **A-04, A-06** — App shell
2. **B-01, B-04** — Login + username
3. **C-01, C-02, C-05** — Home list UI
4. **D-01–D-07** — Song view mockup
5. **D-11, D-12** — Autoscroll
6. **F-01, F-04, F-06** — User playlists
7. **J-01, J-02, J-03** — Rules hardening
8. **H-01–H-04** — Admin dashboard

Chord highlight editor (Phase E) can ship after musicians are using new song view.

---

## Reference images → phases

| Image | Phase |
|-------|-------|
| login.png | B |
| home.png, home2.png | C |
| lyrics.png, mobile lyris.png, oirginalkeykyrics.png | D |
| autoscroll.jpeg | D (speed bar only) |
| playlist.png, playlist2.png | F |
| groups.png | G |
| admin.png, admindashboard.png | H |
| edit song.png | E + H |

---

## Preserved features checklist (never remove)

- [ ] Transpose ± and key modal
- [ ] Chords / Numbers toggle
- [ ] Text zoom (A−/A+) + pinch zoom mobile
- [ ] Performance mode lyric wrap
- [ ] Playlist song prev/next + swipe
- [ ] Per-playlist key override
- [ ] Offline playlist cache
- [ ] Admin song edit draft/publish
- [ ] PWA / offline banner
- [ ] Stage theme on performance view
