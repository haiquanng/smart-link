# Security rules

- Never commit secrets. `.env*` is ignored; `.env.example` lists names only.
- Service role key and AI keys exist only in Edge Function secrets. Never ship them to the browser or log them.
- RLS on every table. Policies are `user_id = auth.uid()`; public collections are exposed through a dedicated read-only view or function keyed by an unguessable slug.
- Shortcut ingest uses a personal API token: random 32+ bytes, stored hashed, revocable, shown once at creation. Rate limit the ingest endpoint.
- Treat all saved content as untrusted: escape on render, never `dangerouslySetInnerHTML`, never follow scraped links automatically beyond the URL the user saved.
- When fetching a user-supplied URL server-side, block private and loopback address ranges (SSRF), cap response size and time (5s, 1MB), and only accept http/https.
- Do not log full URLs with tokens or user notes at info level.
- Uploaded screenshots go to a private bucket, served by signed URLs.
