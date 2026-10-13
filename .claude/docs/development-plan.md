# Development plan

Status as of 2026-10-13. Issues live on GitHub (`haiquanng/smart-link`); this is the order and the reason for it.

## Done (merged to `dev`)
| Phase | What | Issue / commit |
|---|---|---|
| 0-2 | Shortcut capture, schema + RLS, `ingest`, PWA Inbox/Search/Settings | pre-issue history |
| 3 | Enrich: metadata, Gemini OCR/title/summary/tags, embeddings, retry cron | `014ad14` |
| 4 | Hybrid search, filters, no-diacritics | `6c53a1a` |
| Security | Rate limit ingest + search | #13 |
| Capture | Android Web Share Target | #11 (PR #16) |
| 5 | Collections | #5 |
| 5 | Public read-only share link | #6 |
| 5 | Resurface tab | #7 |
| 3 | Edit item, remove AI fields | #9 |
| 3 | Retry enrich from the card | #10 |

## In review
| PR | Into | Contains |
|---|---|---|
| #24 | `dev` | #14 core-loop e2e, CI/CD, #8 Web Push, #12 Chrome extension, #15 themes, workflow docs (PRs #17-#22 were merged into stacked feature branches, not `dev`) |

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
2. The owner runs `npx supabase db push` and `npx supabase functions deploy --use-api` (see development-workflow.md -> Deploy).
3. Vercel builds `main`. Smoke test on the phone: save, search, open a shared link.
