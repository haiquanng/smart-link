# Architecture overview

## Flow
```
Capture (iOS Shortcut | in-app paste | screenshot upload | Android Share Target)
   -> POST /functions/v1/ingest   (api token or session JWT, validate, offline normalize, insert status=pending)
   -> enrich (background): resolve FB /share/ redirect + re-dedupe -> fetch metadata -> OCR/summary (Gemini) -> tags -> embedding (Google) -> status=ready
PWA (Inbox | Search | Collections | Rate limit | `rate_limits` table + `hit_rate_limit()` (fixed windows, security definer) | ingest 30/min and 500/day per user (all tokens + session share it), search 60/min; 429 with `Retry-After`; a failing check lets the request through |
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
| Enrich retry | `pg_cron` + `pg_net` -> `enrich` `{ "retry_stuck": true }` every 15 min | Re-runs items `pending` >10 min or `enrich_failed`, while `enrich_attempts < 3`, 10 per run; auth by `CRON_SECRET` |
| Storage | Supabase Storage, private bucket `screenshots` (5MB, jpeg/png/webp) | Path `{user_id}/{uuid}.jpg`, owner-only RLS, no update; signed URLs (1h, cached 50 min) |
| Sweep | Edge Function `sweep-screenshots` via `pg_cron` + `pg_net` | Daily; deletes objects >24h old not referenced by `items.image_path`; auth by `CRON_SECRET` |
| Resurface | `pg_cron` or scheduled function | Daily pick of old, unseen items |

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
    "name": "text",
    "public_slug": "text, nullable, unguessable; non-null means shareable read-only"
  },
  "collection_items": {
    "collection_id": "uuid fk",
    "item_id": "uuid fk",
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
  "profiles": {
    "id": "uuid pk fk auth.users, RLS (id = auth.uid())",
    "email": "text",
    "display_name": "text, nullable",
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

## Search
`search_items(query text, query_embedding vector(768), filters jsonb, max_results int)` (security invoker, RLS applies) returns items ranked by `0.6 * fts_score + 0.4 * cosine_similarity`, where `fts_score = ts_rank(fts, q, 32)` scaled so the best text match in the result set is 1 and `unaccent` is applied to the query. Candidates = full-text matches ∪ the 50 nearest embeddings with cosine similarity >= 0.65 (measured: unrelated ~0.55-0.60, related ~0.70). If `query_embedding` is null or an item has no embedding, that item is ranked by full text only (business rule 12). Filters (all optional): `sources text[]`, `tags text[]` (any), `collection_id uuid`, `from`/`to` timestamptz.

The browser calls Edge Function `search` (`POST /functions/v1/search`, user JWT, body `{ query, filters }` validated by Zod). It embeds the query with `gemini-embedding-2` (`task: search result | query: {q}`, 768 dims, ~2s timeout) and calls `search_items` with the caller's JWT so RLS still applies. If embedding fails, it calls with `query_embedding = null`. The Gemini key never reaches the browser.

Tapping a card opens the original source (`url`, or the signed screenshot for screenshot-only items). There is no in-app detail view.

## Known limits
- Facebook, Instagram, Threads often block content fetch. The note and screenshot cover this.
- iOS PWA cannot receive Share. iOS capture is the Shortcut, in-app paste, or screenshot upload.
- Facebook `/share/` links must be redirected to resolve the real URL. Ingest skips this to save fast; `enrich` resolves it, updates `url_normalized`, and merges into an existing item if the resolved URL is already saved.
