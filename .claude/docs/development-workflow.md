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
- Branch per task: `feat/<short-name>`, `fix/<short-name>`.
- Small commits, imperative subject, no more than 72 chars.
- No force push. Squash merge to `main`.

## Environment
`.env.example` names: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (frontend); `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` (edge function secrets only).

## Open questions
- Embedding model and dimension for Vietnamese text (placeholder 1024).
- Whether to run enrich inline after insert or via a database webhook.
- Magic link only, or add Google sign-in in phase 2.
