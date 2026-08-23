---
id: webmvp-001
title: Scaffold Next.js app in webmvp
status: closed
type: task
labels: [webmvp, task]
blocked_by: []
blocks: [webmvp-002, webmvp-005]
---

## Goal

Create a runnable Next.js app inside `webmvp/` — empty shell, dev server works.

## Work

```bash
cd webmvp
npx create-next-app@latest . --typescript --app --eslint --tailwind --no-src-dir
# OR with src/: adjust to match PLAN.md folder layout
npm run dev
```

Use App Router + TypeScript. Tailwind optional but fine.

## Acceptance criteria

- [x] `webmvp/package.json` exists
- [x] `npm run dev` starts on localhost:3000
- [x] Default page loads without errors
- [x] Folder ready for `src/app`, `src/lib`, `src/components`, `src/data`

## References

- [`webmvp/docs/PLAN.md`](../../webmvp/docs/PLAN.md) — Step 1

## Resolution

Scaffolded Next.js 15 (App Router + TypeScript) inside `webmvp/` with Tailwind CSS v4 and ESLint. Used `src/` layout: `src/app/` (layout, page, globals.css), plus empty `src/lib/`, `src/components/`, and `src/data/` directories for upcoming tickets. Preserved existing `docs/` and `tickets/` folders.

`create-next-app` could not run in-place (non-empty directory), so project files were created manually to match the standard scaffold output. Ran `npm install` and verified `npm run dev` serves the default page at http://localhost:3000 (HTTP 200, compiles without errors).
