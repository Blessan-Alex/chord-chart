# Web admin composer UX — plan (decisions locked)

**Scope:** `webmvp` only. **Mobile:** later.

## Decisions

| Topic | Choice |
|-------|--------|
| Auto section names | **Verse 1**, **Verse 2**, … (explicit `{Chorus}` still supported) |
| New song drafts | `songs.status = draft`, **visible “Draft”** badge on admin library |
| Musician view | **Very light** lyrics, chords full contrast (`SongViewMode.focus`) |
| Title-only save | **No** — require title + ≥1 non-empty lyric line |

## Shipped behavior (see code)

- `parseFlexibleLyricSource` — blank line starts next verse; single parser path
- `canPersistComposer` gates continue, autosave, publish
- `+ Chord line below` removed from web `InteractiveEditor`
- `ComposerActionBar` — Back, Undo, Save/Publish sticky
- Autosave — debounced `updateDraft` on edit; import creates draft song → `/song/[id]/edit`
- `publishDraft` sets `status: active`
