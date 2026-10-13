# Development workflow

## Principles
Ship the risky part first, keep it small, verify on a real phone.

## Phases
| Phase | Goal | Done when |
|---|---|---|
| 0 Spike | iOS Shortcut sends share data | Shortcut posts URL + dictated note to a test endpoint from real Facebook, Instagram, Threads, Substack shares; payloads recorded in `tests/fixtures/` |
| 1 Core | Auth, schema, `ingest`, RLS | Shortcut saves an item that appears in the DB under the right user; duplicate and invalid cases handled |
| 2 PWA | Inbox, Search (text), Settings (token + Shortcut guide), installable | Works on iPhone Safari and installed to Home Screen |
| 3 Enrich | Metadata, screenshot OCR, summary, tags, embedding | Failed enrich never loses an item |
| 4 Search | Hybrid ranking, no-diacritics, filters | Business rules 11-14 pass |
| 5 Reuse | Resurface, collections, public share, Web Push (optional) | Business rules 15-21 pass |

Phase 0 and 1 are the biggest risk. Do not build UI polish before the Shortcut path works end to end.

## Task flow
1. `analyze-ticket` to turn a request into a short spec and acceptance criteria.
2. `implement-feature` or `fix-bug` to change code with tests.
3. `verify-changes` to run typecheck, lint, tests.
4. `code-review` before merge.

## Git
- Claude never commits or pushes. Not `git commit`, not `git push`, not PRs or tags. Both are blocked in `.claude/settings.json`.
- Claude leaves changes in the working tree and ends with a suggested branch name and commit message for the user to run.
- User convention: branch per task `feat/<short-name>`, `fix/<short-name>`; imperative subject up to 72 chars; no force push; squash merge to `main`.

## Environment
`.env.example` names: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (frontend); `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` (edge function secrets only).

## Screenshot sweep setup
The daily `sweep-screenshots` cron (migration `20261011000004`) needs two Vault secrets created by hand, never in git:
- `project_url`: the project URL (local: `http://host.docker.internal:54321`).
- `cron_secret`: a random 32+ byte value.
Set the same value as an edge function secret: `supabase secrets set CRON_SECRET=<same value>`. Without both, the sweep call fails and orphaned screenshots stay in the bucket.

## AI enrichment setup
- Hosted: `supabase secrets set GEMINI_API_KEY=<key>` (optional `GEMINI_MODEL`, default `gemini-3.5-flash-lite`). Locally: `supabase/functions/.env` or `supabase functions serve --env-file .env`.
- Without `GEMINI_API_KEY`, enrich skips the AI step, saves metadata and sets `ready` (so dev items are not marked failed). Items saved that way get no summary, tags, OCR or embedding until re-run with a key.
- Migration `20261011000005` schedules `retry-enrich` (pg_cron, every 15 min) using the same Vault secrets as the sweep (`project_url`, `cron_secret`) and the `CRON_SECRET` function secret. It retries `enrich_failed` and `pending` older than 10 min, at most 3 attempts, 10 items per run.
- Deno functions are not type-checked by CI (no `deno` in the dev environment so far); run `deno check supabase/functions/*/index.ts` when available. Pure logic is unit-tested in `src/lib` and mirrored in `supabase/functions/_shared` (`aiPatch.ts`, `geminiParse.ts`, `metadata.ts`); keep mirrors in sync.
- Integration coverage for enrich with a mocked Gemini is not practical in the edge runtime; the pure parts are covered by unit tests.

## Phase 4 search setup
- Push the migration (`supabase db push`): `20261011000006` replaces `search_items` with the hybrid version, adds `user_tags()`, and re-queues pre-AI items (`ready` with no embedding -> `pending`, attempts 0). The `retry-enrich` cron then embeds them gradually, 10 per 15 min, so a large backlog takes a while; search works on full text meanwhile.
- Deploy the function: `supabase functions deploy search` (JWT verification stays on). It needs `GEMINI_API_KEY` (already set for enrich); without it search is full-text only (`semantic: false`). `SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided by the Supabase runtime.
- `supabase/functions/_shared/searchBody.ts` mirrors `src/lib/searchBody.ts`; `queryEmbeddingText` is mirrored in `geminiParse.ts`. Keep in sync.
- The SQL has not been run in CI (no local Supabase); try a search with and without filters after pushing.

## Vercel deploy
- Project settings -> Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (anon key only).
- Supabase Auth -> URL Configuration: set Site URL to the production domain and add the Vercel domain (and preview pattern if wanted) to Redirect URLs.
- `vercel.json` at the repo root handles the SPA fallback and keeps `sw.js` uncached so updates reach installed PWAs.

## Rate limits
- Migration `20261013000001` adds `rate_limits` and `hit_rate_limit()`. `ingest` and `search` call it per user; a 429 carries `Retry-After` and the client keeps the input.
- Defaults: ingest 30/min and 500/day, search 60/min. Override with function secrets `RATE_LIMIT_INGEST_PER_MIN`, `RATE_LIMIT_INGEST_PER_DAY`, `RATE_LIMIT_SEARCH_PER_MIN`.
- Integration test `tests/integration/rateLimit.integration.test.ts` runs against local Supabase (`npx supabase start`) with two test user ids.
- Deno functions can be type-checked without a local install: `docker run --rm -v "$PWD/supabase/functions:/fn" -w /fn denoland/deno:2.1.4 deno check */index.ts`.

## Public share deploy
`supabase functions deploy public-collection --no-verify-jwt` (also set in `config.toml`). Visitors have no session; the function only answers for a valid live slug.

## Local functions
`npx supabase functions serve --env-file <file>` runs every function against the local stack, so `tests/integration` (ingest, rate limit, collections, public share) and `tests/e2e/live` can run fully offline from production.

## Preview e2e (service worker)
`tests/e2e/live/shareTargetPost.spec.ts` needs the built worker: `VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npx vite build --outDir /tmp/sl-preview && npx vite preview --outDir /tmp/sl-preview --port 5288`, then run Playwright with `E2E_PREVIEW=1 E2E_PORT=5288` plus the live env below. On a real Android phone: install the PWA from Chrome, then share from any app and pick Smart Link.

## Live e2e
Specs in `tests/e2e/live/` run against a real Supabase with no network mocks and skip unless configured. Locally: `npx supabase start`, create a confirmed user, then
`VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=<local anon> E2E_SERVICE_ROLE_KEY=<local service role> E2E_USER=<email:password> E2E_PORT=<free port> npm run test:e2e`.
The mocked specs keep working in the same run because they intercept `localhost:54321` themselves.

## Open questions
## Resolved
- Enrich runs via a fire-and-forget call from ingest (non-blocking), re-runnable on demand, with a pg_cron retry fallback (`retry-enrich`).
- Embedding: `gemini-embedding-2`, 768 dims (auto-normalized). Documents embedded as `title: {title} | text: {note}\n{summary}\n{ocr}`, max ~6000 chars. Switching models requires re-embedding everything.
- Phase 3 AI: one Gemini call per item (OCR, title, summary, tags), then embedding; implemented in `supabase/functions/enrich`.
- Auth: email + password (switched from magic link for cost/rate-limit reasons).
