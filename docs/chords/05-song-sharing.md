# Song sharing (public charts)

Songs in the library are **public read** in Firestore (`songs/*` where `status == active`). Anyone with the link can open the chart **without signing in**.

## URLs

| Resource | URL | Auth |
|----------|-----|------|
| Song chart | `/song/{songId}` | None (guest OK) |
| Playlist | `/join/p/{token}` | Sign in to join |
| Group | `/join/g/{code}` (Phase C) | Sign in to join |

## UI

- **Song page** — Share + copy link in the header (`SongShareButton`)
- Uses Web Share API (WhatsApp, Messages, etc.) with fallback to clipboard
- Share text: `Chord chart: {title}` + URL

## Why no song invite token?

Song ids are already public in the catalog. Sharing `/song/{id}` does not grant playlist/group access or admin rights. Playlists stay private and require invite tokens + sign-in.

## SEO / preview (later)

Optional Open Graph tags on `/song/[id]` for rich previews in WhatsApp/iMessage.
