---
id: webmvp-011
title: Fix [object Event] runtime error
status: closed
type: bugfix
labels: [webmvp, bugfix]
blocked_by: [webmvp-010]
blocks: []
---

## Goal

Diagnose and harden against Next.js dev overlay showing `Runtime Error — [object Event]`.

## Root cause

No single app bug reproduced a raw Event in state handlers — the key selector already extracted `event.target.value`. The overlay message appears when:

1. **Dev/HMR or stale `.next` cache** — JS chunks 404; script `error` events surface as `[object Event]` in the Next.js overlay (most common during dev).
2. **Unhandled navigation rejection** — `router.push()` on import save had no `.catch()`.
3. **Missing error boundary** — failures rendered as unhelpful overlay text instead of formatted messages.

## Fixes applied

- `src/lib/formatError.ts` — format Error, Event, and unknown values safely
- `src/app/error.tsx` + `global-error.tsx` — user-facing error UI with Try again / Home
- `song/[id]/page.tsx` — guarded `handleKeyChange` / `handleShowChordLettersChange` (never accept Event as key)
- Song view — guarded key select validates `ALL_KEYS` before calling onChange
- `ChordLine` — try/catch around `transposeChord`; invalid key skipped
- `import/page.tsx` — `formatError` for save errors (App Router `router.push` is void, not Promise)

## Verify

```bash
cd webmvp
npm run build && npm run start
```

- Import → save → song view — no overlay error
- Change key repeatedly — no error
- Toggle chord letters — no error
- If error only after HMR/code save: clear `.next`, restart dev server (known dev noise)

## Acceptance criteria

- [x] Error boundary shows readable messages
- [x] Event handlers hardened against invalid state
- [x] Navigation errors caught on import save
- [x] npm run build passes

## Resolution

Hardened error handling and event guards across song view and import save. Added `formatError` utility and app error boundaries. Primary `[object Event]` during dev often indicates stale `.next`/HMR chunk load failure — restart dev or delete `.next` if overlay persists after code changes.
