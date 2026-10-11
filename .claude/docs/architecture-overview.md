# Architecture overview

## Flow
```
Capture (iOS Shortcut | in-app paste | screenshot upload | Android Share Target)
   -> POST /functions/v1/ingest   (token auth, validate, normalizeUrl, insert status=pending)
   -> enrich (background): fetch metadata -> OCR/summary (Claude) -> tags -> embedding -> status=ready
PWA (Inbox | Search | Collections | Resurface | Settings)
   -> Supabase client under RLS -> search_items() / tables
```

## Components
| Part | Tech | Notes |
|---|---|---|
| PWA | Vite, React, TS, Tailwind, vite-plugin-pwa | Installable, offline shell, reads via Supabase |
| Auth | Supabase Auth | Magic link first; Google optional |
| DB | Postgres + pgvector + unaccent | RLS on all tables |
| Ingest | Edge Function `ingest` | Single entry for all channels |
| Enrich | Edge Function `enrich` | Triggered after insert; idempotent; retryable |
| Storage | Supabase Storage, private bucket `screenshots` | Signed URLs |
| Resurface | `pg_cron` or scheduled function | Daily pick of old, unseen items |

## Data model (JSON)
```json
{
  "items": {
    "id": "uuid pk",
    "user_id": "uuid fk auth.users, RLS",
    "url": "text, original as sent, nullable (screenshot-only items)",
    "url_normalized": "text, nullable, unique with user_id",
    "source": "enum: facebook | instagram | threads | substack | web | screenshot | other",
    "channel": "enum: shortcut | paste | upload | share_target | extension | manual",
    "note": "text, user's own words, primary search signal",
    "title": "text, nullable",
    "summary": "text, nullable, AI",
    "content_text": "text, nullable, scraped or OCR",
    "image_path": "text, nullable, storage path of screenshot",
    "preview_image_url": "text, nullable",
    "status": "enum: pending | ready | enrich_failed",
    "seen_at": "timestamptz, nullable, set when user opens or dismisses in Resurface",
    "created_at": "timestamptz default now()",
    "fts": "tsvector generated from unaccent(note, title, summary, content_text), weights A,B,B,C",
    "embedding": "vector(1024), nullable"
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
Response `201`: `{ "id": "uuid", "status": "pending", "duplicate": false }`. Duplicate normalized URL returns `200` with `duplicate: true` and appends the new note to the existing item.
At least one of `url`, `note`, or an uploaded image is required.

## Search
`search_items(query text, filters jsonb, limit int)` returns items ranked by `0.6 * fts_rank + 0.4 * vector_similarity`, with `unaccent` applied to the query. If no embedding exists yet, fall back to full-text only. Filters: source, tag, collection, date range.

## Known limits
- Facebook, Instagram, Threads often block content fetch. The note and screenshot cover this.
- iOS PWA cannot receive Share. iOS capture is the Shortcut, in-app paste, or screenshot upload.
- Facebook `/share/` links must be redirected to resolve the real URL before dedupe.
