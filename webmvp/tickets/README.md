# Tickets — LF ChordApp

Local markdown issue tracker. No GitHub required.

## How to use

1. Open **[MAP.md](MAP.md)** — see destination and frontier
2. Pick the first **open, unblocked** ticket
3. Implement it (use `/implement` skill)
4. Mark ticket `status: closed` in frontmatter
5. Add one-line gist to MAP **Decisions so far**
6. Move to next ticket

## Web MVP tickets

All in [`webmvp/`](webmvp/):

```text
001 Scaffold Next.js        ← start here
002 Types + Twinkle preset
003 Transposition engine     ← pure logic (/prototype)
004 localStorage
005 Home page
006 Import page
007 Song view + transpose
008 E2E verification         ← done when all pass
```

## Dependency chain

```text
001 ──→ 002 ──→ 003 ──→ 006 ──→ 007 ──→ 008
          │       │
          └──→ 004 ──→ 005 ───────────────→ 008
```

## One ticket per session

Work one ticket at a time. Ticket 003 (engine) can be validated before any UI.
