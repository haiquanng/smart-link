# Architecture overview

## Flow
```
Capture (iOS Shortcut | in-app paste | screenshot upload | Android Share Target)
   -> POST /functions/v1/ingest   (api token or session JWT, validate, offline normalize, insert status=pending)
   -> enrich (background): resolve FB /share/ redirect + re-dedupe -> fetch metadata -> OCR/summary (Gemini) -> tags -> embedding (Google) -> status=ready
PWA (Inbox | Search | Collections | Rate limit | `rate_limits` table + `hit_rate_limit()` (fixed windows, security definer) | ingest 30/min and 500/day per user (all tokens + session share it), search 60/min; 429 with `Retry-After`; a failing check lets the request through |
| Push reminders | `push_subscriptions` + Edge Function `send-reminders` via `pg_cron` hourly (`:05`) | One push per device per local day at 19:00, only if the user has resurface candidates (`resurface_candidates()`, service role). Sent with VAPID (`npm:web-push` builds the encrypted request, `fetch` sends it). Endpoints must be a known push service (SSRF guard `isPushEndpointAllowed`); 404/410 delete the row. Toggle in Settings only in an installed PWA (iOS 16.4+ Home Screen) |
| Resurface | Settings)
   -> Supabase client under RLS -> search_items() / tables
```

## Components
| Part | Tech | Notes |
|---|---|---|
| PWA | Vite, React, TS, Tailwind, vite-plugin-pwa | Installable, offline shell, reads via Supabase |
| Auth | Supabase Auth | Email + password; `profiles` row per user via trigger |
| DB | Postgres + pgvector + unaccent | RLS on all tables |
| Ingest | Edge Function `ingest` | Single entry for all channels |
| Enrich | Edge Function `enrich` | Triggered after insert; idempotent; retryable. One Gemini call (`GEMINI_MODEL`, default `gemini-3.5-flash-lite`) returns OCR + title + summary + tags as JSON; then `gemini-embedding-2` at 768 dims |
| Enrich (user) | `enrich` with the owner's JWT: `{ item_id, mode: "embed" | "retry" }` | Ownership checked, 10/min per user. `embed` recomputes only the embedding after an edit (title, summary, tags untouched, so removed AI fields stay gone); `retry` runs full enrich again, ignoring the 3-attempt cap |
| Enrich retry | `pg_cron` + `pg_net` -> `enrich` `{ "retry_stuck": true }` every 15 min | Re-runs items `pending` >10 min or `enrich_failed`, while `enrich_attempts < 3`, 10 per run; auth by `CRON_SECRET` |
| Storage | Supabase Storage, private bucket `screenshots` (5MB, jpeg/png/webp) | Path `{user_id}/{uuid}.jpg`, owner-only RLS, no update; signed URLs (1h, cached 50 min) |
| Sweep | Edge Function `sweep-screenshots` via `pg_cron` + `pg_net` | Daily; deletes objects >24h old not referenced by `items.image_path`; auth by `CRON_SECRET` |
| Push reminders | `push_subscriptions` + Edge Function `send-reminders` via `pg_cron` hourly (`:05`) | One push per device per local day at 19:00, only if the user has resurface candidates (`resurface_candidates()`, service role). Sent with VAPID (`npm:web-push` builds the encrypted request, `fetch` sends it). Endpoints must be a known push service (SSRF guard `isPushEndpointAllowed`); 404/410 delete the row. Toggle in Settings only in an installed PWA (iOS 16.4+ Home Screen) |
| Resurface | `resurface_today(p_today)` + `resurface_picks` table | Picks made lazily on the first open of the user's local day (up to 3 oldest unseen, >=3 days old), stored so the list is stable all day; open/dismiss sets `seen_at`; `resurface_reset()` clears `seen_at` and picks. No cron needed |

## Data model (JSON)
```json
{
  "items": {
    "id": "uuid pk",
    "user_id": "uuid fk auth.users, RLS",
    "url": "text, original as sent, nullable (screenshot-only items)",
    "url_normalized": "text, nullable, unique with user_id; null on a second screenshot of an already-saved URL (url still kept)",
    "source": "enum: facebook | instagram | threads | substack | web | screenshot | other",
    "channel": "enum: shortcut | paste | upload | share_target | extension | manual",
    "note": "text, user's own words, primary search signal",
    "title": "text, nullable; scraped first, AI fills it only when empty",
    "title_origin": "enum tag_origin (user | ai), nullable; ai when Gemini wrote the title, null when scraped (business rule 8)",
    "summary": "text, nullable, AI",
    "content_text": "text, nullable, scraped or OCR",
    "image_path": "text, nullable, object name in private bucket screenshots: '{user_id}/{uuid}.jpg'; set only by ingest after ownership + existence check",
    "preview_image_url": "text, nullable",
    "status": "enum: pending | ready | enrich_failed",
    "enrich_attempts": "int default 0, incremented on each enrich run; retry stops at 3",
    "seen_at": "timestamptz, nullable, set when user opens or dismisses in Resurface",
    "created_at": "timestamptz default now()",
    "fts": "tsvector generated from unaccent(note, title, summary, content_text), weights A,B,B,C",
    "embedding": "vector(768), nullable, gemini-embedding-2 of note + title + summary + content_text; HNSW cosine index"
  },
  "tags": {
    "id": "uuid pk",
    "user_id": "uuid fk, RLS",
    "name": "text, unique with user_id"
  },
  "item_tags": {
    "item_id": "uuid fk items",
    "tag_id": "uuid fk tags",
    "origin": "enum: user | ai",
    "primary key": ["item_id", "tag_id"]
  },
  "collections": {
    "id": "uuid pk",
    "user_id": "uuid fk, RLS",
    "name": "text, 1-60 chars after trim",
    "public_slug": "text, nullable, 24-char url-safe random (18 bytes); non-null means shareable read-only",
    "share_notes": "bool default false; public view includes the owner's notes",
    "share_images": "bool default false; public view includes screenshots as signed URLs",
    "created_at": "timestamptz default now()"
  },
  "collection_items": {
    "collection_id": "uuid fk",
    "item_id": "uuid fk",
    "user_id": "uuid fk, RLS; insert/update also require the collection and the item to belong to auth.uid()",
    "primary key": ["collection_id", "item_id"]
  },
  "api_tokens": {
    "id": "uuid pk",
    "user_id": "uuid fk, RLS",
    "token_hash": "text, sha256 of token, token shown once",
    "label": "text, e.g. 'iPhone shortcut'",
    "last_used_at": "timestamptz, nullable",
    "revoked_at": "timestamptz, nullable"
  },
  "rate_limits": {
    "user_id": "uuid fk auth.users, RLS on with no policies (only hit_rate_limit touches it)",
    "bucket": "text, e.g. 'ingest:min', 'ingest:day', 'search:min'",
    "window_start": "timestamptz, start of the fixed window",
    "hits": "int",
    "primary key": ["user_id", "bucket", "window_start"]
  },
  "resurface_picks": {
    "user_id": "uuid fk, RLS",
    "pick_date": "date, the user's local day",
    "item_id": "uuid fk items, cascade",
    "primary key": ["user_id", "pick_date", "item_id"]
  },
  "push_subscriptions": {
    "id": "uuid pk",
    "user_id": "uuid fk, RLS",
    "endpoint": "text unique, browser push service URL",
    "p256dh": "text", "auth": "text",
    "time_zone": "text, IANA zone of the device, for the 19:00 local send",
    "last_sent_at": "timestamptz, nullable",
    "created_at": "timestamptz"
  },
  "profiles": {
    "id": "uuid pk fk auth.users, RLS (id = auth.uid())",
    "email": "text",
    "display_name": "text, nullable",
    "theme": "text default 'default', one of default | peach | mint | lavender | dark",
    "created_at": "timestamptz, auto-created on signup via trigger"
  }
}
```

## Ingest contract
Request `POST /functions/v1/ingest`, header `Authorization: Bearer <api token>`:
```json
{
  "url": "https://www.facebook.com/share/1KWvE4QeZK/?mibextid=wwXlfr",
  "note": "cach dinh gia SaaS, dung cho Tutora",
  "channel": "shortcut"
}
```
Response `201`: `{ "id": "uuid", "status": "pending", "duplicate": false }`. Duplicate normalized URL returns `200` with `duplicate: true` and appends the new note to the existing item. With `image_path`: if the existing item has no image, the image is attached (200, duplicate); otherwise a separate item is created with `url` kept and `url_normalized = null` (201). Enrich applies the same rule when a resolved redirect hits an existing item.

Screenshot upload: the client downscales to JPEG, uploads to `screenshots/{user_id}/{uuid}.jpg` with its session, then posts `{ "url"?, "note"?, "channel": "upload", "image_path": "{user_id}/{uuid}.jpg" }`. Ingest checks the pattern, that the prefix equals the authenticated user (session JWT or api token), and that the object exists; otherwise 400/403. Items with an image and no URL get `source = 'screenshot'`. One item per screenshot. Item delete removes the row first, then the object (a failed object delete is collected by the sweep).
At least one of `url`, `note`, or `image_path` is required.

## Android Share Target
The manifest declares `share_target` (POST, multipart: `title`, `text`, `url`, `images`). A static host cannot receive that POST, so `public/share-target-sw.js` (imported into the Workbox worker) stores the share in Cache Storage (`share-target-v1`) and redirects to `/share?incoming=1`. `/share` reads it (`src/lib/shareInbox.ts`), recovers the link from `url`, `text` or `title` (`parseSharePayload`, reusing `coerceSharedUrl`), lets the user add a note, and saves through `ingest` with `channel = 'share_target'`: one screenshot item per image (each with the link and note) or one link item. The cache is cleared only after the save succeeds; a signed-out user signs in on the same URL and the share is still there. `/share?title=&text=&url=` (GET) also works, for when the worker is not installed yet. Android only.

## Chrome extension
`extension/` is a separate Manifest V3 bundle (`npm run build:extension` → `extension/dist`, load unpacked). Popup: the active tab's URL plus a note, saved with the user's personal api token (pasted once, `chrome.storage.local`) to the same `ingest` endpoint with `channel = 'extension'`. A right-click menu saves a page or link without a note (badge shows the result). Permissions: `activeTab`, `storage`, `contextMenus`, and host access to the project's Supabase origin only, set at build time from `VITE_SUPABASE_URL`. Revoking the token in Settings makes the popup ask for a new one.

## Themes
A theme (`src/lib/themes.ts`) is a few flat colors: canvas, surface, ink, line, accent (+ soft), danger/success/warning. The neutral scale (`stone-50…900`) is mixed from surface toward ink, so every theme tints its greys consistently. `applyTheme` overrides the Tailwind v4 CSS variables (`--color-stone-*`, `--color-white`, `--color-ink`, …) on `<html>`, so components keep their utility classes. Choice is stored in `profiles.theme` (follows the user across devices) and cached in localStorage so `main.tsx` applies it before the first paint. Unit tests check WCAG AA (4.5:1) for every text/background pair the components use, in every theme. Themes: default, peach, mint, lavender (light), dark (opt-in, never the default).

## Search
`search_items(query text, query_embedding vector(768), filters jsonb, max_results int)` (security invoker, RLS applies) returns items ranked by `0.6 * fts_score + 0.4 * cosine_similarity`, where `fts_score = ts_rank(fts, q, 32)` scaled so the best text match in the result set is 1 and `unaccent` is applied to the query. Candidates = full-text matches ∪ the 50 nearest embeddings with cosine similarity >= 0.65 (measured: unrelated ~0.55-0.60, related ~0.70). If `query_embedding` is null or an item has no embedding, that item is ranked by full text only (business rule 12). Filters (all optional): `sources text[]`, `tags text[]` (any), `collection_id uuid`, `from`/`to` timestamptz.

The browser calls Edge Function `search` (`POST /functions/v1/search`, user JWT, body `{ query, filters }` validated by Zod). It embeds the query with `gemini-embedding-2` (`task: search result | query: {q}`, 768 dims, ~2s timeout) and calls `search_items` with the caller's JWT so RLS still applies. If embedding fails, it calls with `query_embedding = null`. The Gemini key never reaches the browser.

Tapping a card opens the original source (`url`, or the signed screenshot for screenshot-only items). There is no in-app detail view.

## Editing
The card's pencil opens an edit sheet (note, title, remove AI summary, tags; delete lives there too). Writes go straight to `items` / `tags` / `item_tags` under RLS; `item_tags` inserts require the item and the tag to belong to the caller. A typed title is stored with `title_origin = 'user'`; enrich only fills an empty title and only replaces an `ai` one, so user titles survive (rule 9). Adding a tag that exists as AI on the item turns it into a user tag; enrich only ever replaces `origin = ai` rows. After saving, the client calls `enrich` in `embed` mode.

## Collections
`user_collections()` (security invoker) returns the caller's collections with `item_count`, newest first. A collection's items are read with an inner embed on `collection_items` (`select=...,collection_items!inner()`), so no extra function. Deleting a collection cascades memberships only; items stay. Search filters by one collection via `filters.collection_id` (URL param `col`).

Sharing: `set_collection_sharing(id, enabled, notes, images)` (security invoker). A live link keeps its slug when options change; turning sharing off clears the slug, so the next "on" mints a new one (rule 19). Public reads go only through Edge Function `public-collection` (`POST { slug }`, no user auth), which calls `public_collection(slug)` (security definer, service_role only) and returns name, url, title, summary, preview image, plus note and a 1h signed screenshot URL only when opted in (rule 20). Storage paths never leave the function. The PWA renders it at `/c/:slug` without a session.

## Known limits
- Facebook, Instagram, Threads often block content fetch. The note and screenshot cover this.
- iOS PWA cannot receive Share. iOS capture is the Shortcut, in-app paste, or screenshot upload.
- Facebook `/share/` links must be redirected to resolve the real URL. Ingest skips this to save fast; `enrich` resolves it, updates `url_normalized`, and merges into an existing item if the resolved URL is already saved.
