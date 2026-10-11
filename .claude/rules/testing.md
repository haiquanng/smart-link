# Testing rules

- Unit (Vitest) for pure logic: `normalizeUrl`, query parsing, ranking merge, resurface selection. These are the bugs that hurt most.
- Integration for edge functions with a local Supabase: ingest saves a row even when metadata fetch fails; duplicate URL does not create a second row; RLS blocks another user's rows.
- E2E (Playwright, 390x844 viewport) for the core loop: sign in, see an item in Inbox, search finds it by note, search finds it without Vietnamese diacritics.
- Fixtures: keep a small set of real-looking Facebook, Instagram, Threads, Substack URLs in `tests/fixtures/urls.json`, including `/share/` redirects and tracking params.
- Mock network and AI calls. Tests never hit real third-party sites or the Claude API.
- A bug fix starts with a failing test that reproduces it.
- Do not chase coverage numbers. Cover behavior listed in `.claude/docs/business-rules.md`.
