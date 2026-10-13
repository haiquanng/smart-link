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

## In review (PR open, owner merges)
| Issue | Branch |
|---|---|
| #11 Android Web Share Target | `feat/android-share-target` |

## Next, in order
| # | Issue | Why this order |
|---|---|---|
| 1 | #14 Core-loop e2e | Locks the main loop before bigger changes; feeds CI |
| 2 | CI/CD | Every later PR is checked automatically; deploys stop being manual |
| 3 | #8 Web Push reminders | Builds on Resurface; needs VAPID secrets, optional feature |
| 4 | #12 Chrome extension | Separate package, uses existing tokens + ingest |
| 5 | #15 UI polish + themes | Last: touches every screen, would conflict with feature work |

## Later (no issue yet)
- Real-device pass on iPhone (installed PWA) and Android (share sheet).
- Survey-driven: in-app detail view (currently out of scope), shared collections with edit rights.

## Deploy checklist per release (`dev` -> `main`)
1. Owner merges the release PR.
2. CI applies migrations and deploys functions (once CI/CD is in), or the owner runs `npx supabase db push` and `npx supabase functions deploy <changed>`.
3. Vercel builds `main`. Smoke test on the phone: save, search, open a shared link.
