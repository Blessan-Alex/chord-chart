# LF ChordApp — Firebase Architecture Documents

> **Purpose:** Complete, implementation-ready design for evolving the existing web MVP into a Firebase Firestore-backed BaaS for musicians.

## Documents

| # | Document | Description |
|---|---|---|
| 1 | [Product & UX Overview](01-product-ux-overview.md) | User types, core flows, UI map, UX requirements |
| 2 | [Data Model & Firestore Schema](02-data-model-firestore-schema.md) | Collections, fields, types, chord representation, versioning, indexes, 5 example JSON docs |
| 3 | [Security Rules & Access Patterns](03-security-rules-access-patterns.md) | Complete `firestore.rules`, per-collection access, helper functions |
| 4 | [API / Client Usage Patterns](04-api-client-usage-patterns.md) | SDK-first queries/mutations, offline strategy, performance notes, service layer |
| 5 | [Phased Implementation Plan](05-phased-implementation-plan.md) | 6 phases, 36 tickets with acceptance criteria, dependency chain |
| 6 | [Test Plan](06-test-plan.md) | Unit, integration (emulator), E2E (Playwright), performance, offline tests |
| 7 | [Migration & Growth Notes](07-migration-growth-notes.md) | Bulk import, schema evolution, monitoring, Spark limits, growth roadmap |

## Current Codebase Context

The existing `webmvp/` is a Next.js 15 + TypeScript + Tailwind v4 app with:
- **Transposition engine** (`engine.ts`) — 12-semitone, supports major/minor/slash/7th chords
- **Section-based chord model** (`types.ts`) — `Song → Section[] → LyricLine → ChordMark[]`
- **10 worship song presets** (`presets.ts`) — ChordPro-parsed into position-indexed format
- **Interactive chord editor** (`InteractiveEditor.tsx`) — click-to-place chords above lyrics
- **localStorage persistence** (`storage.ts`) — to be replaced by Firestore
- **Mobile-responsive layout** with dark mode, sticky header, chords/numbers toggle

## Key Design Decisions

1. **Same data model:** Firestore schema directly mirrors existing `types.ts` types — minimal refactoring
2. **Position-indexed chords:** `{chord, position}` array (not inline ChordPro) — separates data from display
3. **Subcollection for session songs:** Avoids unbounded arrays, supports individual add/remove/reorder
4. **Flat `songEdits` collection:** Enables cross-song draft queries (e.g., "all open drafts")
5. **Admin SDK for imports:** Bulk seeding bypasses security rules, uses batched writes
6. **Offline = Firestore persistence:** No custom caching layer — SDK handles IndexedDB automatically
