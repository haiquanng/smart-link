# Architecture rules

Full detail in `.claude/docs/architecture-overview.md`. Hard rules:

- Ingest is one endpoint: `POST /functions/v1/ingest`. Shortcut, in-app paste, screenshot upload and Share Target all call the same core `saveItem` logic. No per-channel copies.
- Saving must be fast and never depend on enrichment. Insert the row first with `status = 'pending'`, enrich afterwards, update the row. A failed fetch, OCR, or AI call leaves the item saved and searchable by its note.
- URL handling goes through one `normalizeUrl` function: follow redirects (Facebook `/share/` links), strip tracking params (`mibextid`, `utm_*`, `fbclid`, `igshid`), lowercase host. Dedupe on the normalized URL per user.
- All AI and third-party API keys stay in Edge Functions. The browser only talks to Supabase with the anon key under RLS.
- Every table has `user_id` and Row Level Security. No exceptions.
- Search is a single database function (`search_items`) combining full-text and vector scores. The frontend never builds search SQL.
- Frontend reads through a thin `src/lib/api.ts`. Components do not call Supabase directly.
- No new service, queue, or cron host unless Supabase cannot do it. Use `pg_cron` or Supabase scheduled functions first.
