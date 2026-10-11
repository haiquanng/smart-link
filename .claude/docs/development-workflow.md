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

## Open questions
- Embedding model and dimension for Vietnamese text (placeholder 1024). Decided: Google embeddings (cheapest tier); confirm model/dimension when implemented (may change schema from 1024).

## Phase 3 deferred work (noted TODOs)
- `supabase/functions/enrich` does metadata fetch only. Still to build, marked `TODO(phase-3-ai)`:
  - Gemini summary + tags from note/metadata/content.
  - Screenshot OCR (Gemini vision) -> `content_text`.
  - Google embedding -> `items.embedding`.
  - `pg_cron` fallback to re-run enrich for items stuck `pending`/`enrich_failed` (retryability beyond the ingest fire-and-forget trigger).
- All require provider API keys in edge-function secrets; owner will provide later.

## Resolved
- Enrich runs via a fire-and-forget call from ingest (non-blocking), re-runnable on demand. A pg_cron fallback is still TODO.
- Auth: email + password (switched from magic link for cost/rate-limit reasons).
