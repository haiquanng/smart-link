# Development plan

Status as of 2026-10-13. Issues live on GitHub (`haiquanng/smart-link`); this is the order and the reason for it.

## Done (merged to `dev`)
| Phase | What | Issue / commit |
|---|---|---|
| 0-2 | Shortcut capture, schema + RLS, `ingest`, PWA Inbox/Search/Settings | pre-issue history |
| 3 | Enrich: metadata, Gemini OCR/title/summary/tags, embeddings, retry cron | `014ad14` |
| 4 | Hybrid search, filters, no-diacritics | `6c53a1a` |
| Security | Rate limit ingest + search | #13 |
| 5 | Collections | #5 |
| 5 | Public read-only share link | #6 |
| 5 | Resurface tab | #7 |
| 3 | Edit item, remove AI fields | #9 |
| 3 | Retry enrich from the card | #10 |

## In review (branch pushed, owner opens/merges the PR, in this order)
| Issue | Branch | Base |
|---|---|---|
| #11 Android Web Share Target | `feat/android-share-target` | `dev` |
| Dev flow + this plan | `chore/dev-flow-and-plan` | `feat/android-share-target` |
| #14 Core-loop e2e | `test/core-loop-e2e` | `chore/dev-flow-and-plan` |
| CI/CD | `ci/github-actions` | `test/core-loop-e2e` |
| #8 Web Push reminders | `feat/web-push` | `ci/github-actions` |
| #12 Chrome extension | `feat/chrome-extension` | `feat/web-push` |
| #15 Themes + AA contrast | `feat/themes` | `feat/chrome-extension` |

## Next, in order
| # | Issue | Why this order |
|---|---|---|
| 1 | Release PR `dev` -> `main` | After the stack is merged; then the one-time migration repair and deploy secrets |
| 2 | Design review of screens with the owner | #15 shipped the theme system and contrast fixes; the visual direction of each screen still needs the owner's eye (earlier pass was judged "too AI") |

## Later (no issue yet)
- Real-device pass on iPhone (installed PWA) and Android (share sheet).
- Survey-driven: in-app detail view (currently out of scope), shared collections with edit rights.

## Deploy checklist per release (`dev` -> `main`)
1. Owner merges the release PR.
2. CI applies migrations and deploys functions (once CI/CD is in), or the owner runs `npx supabase db push` and `npx supabase functions deploy <changed>`.
3. Vercel builds `main`. Smoke test on the phone: save, search, open a shared link.
