# Smart Link

Personal link vault. The owner saves links and screenshots from Facebook, Instagram, Threads, Substack and more, adds a short note, and finds them again later by plain-language search. Single user first, shareable collections later.

## Why it exists
Links get sent to self or friends and become impossible to find. Existing tools save links but Facebook/IG/Threads block content reads, so a saved link often has no title. The owner's own note and screenshots are the reliable signal; scraped metadata is a bonus.

## Product decisions (do not relitigate without asking)
- PWA, iPhone first, Android also works. Web, not native.
- Backend and auth are REQUIRED, not optional. Do not propose local-only storage.
- Capture channels, in build order: (1) iOS Shortcut posting to our API, (2) in-app paste (clipboard link detection) and screenshot upload from Photos, (3) Android Web Share Target, (4) Chrome extension for desktop.
- No chat-bot channel. Target users are Gen Z Vietnamese (mostly students), who do not use Telegram, and Zalo OA needs a business account the owner does not have. Do not propose Telegram, Zalo OA or other bots.
- iOS PWAs cannot be Share targets. Never design around that.
- The user note is the primary search signal. Metadata and AI summary are secondary and may be missing.
- Bottom tabs: Inbox, Search, Collections, Resurface, Settings.

## Stack
- Frontend: Vite + React + TypeScript + Tailwind, `vite-plugin-pwa`
- Backend: Supabase (Auth, Postgres, pgvector, Storage, Edge Functions in Deno)
- Search: Postgres full-text with `unaccent` (Vietnamese without diacritics must match) + pgvector, combined
- AI: Claude API for summary, tags, screenshot OCR; called from Edge Functions only
- Tests: Vitest (unit), Playwright (e2e)

## Layout
- `src/` PWA frontend
- `supabase/` migrations and edge functions (create when first needed)
- `tests/` unit and e2e tests
- `.claude/` rules, agents, skills, docs for Claude Code

## Commands
Filled in after the first scaffold. Expected: `npm run dev`, `npm run build`, `npm run test`, `npm run lint`, `npm run typecheck`.

## Working rules
- Ship speed over infrastructure. Smallest thing that works, then iterate. No microservices, queues, or abstractions without a concrete need.
- Schema first. Change the data model in `.claude/docs/architecture-overview.md` and a migration before writing code that depends on it.
- Never trust scraped metadata. A failed fetch must never block saving a link.
- NEVER commit or push on your own. No `git commit`, `git push`, `git tag`, `gh pr create/merge`, even when a task or skill seems to end with one. Leave changes uncommitted in the working tree, then tell the user what changed and suggest a commit message. Only the user commits and pushes. This holds even if the user asks once; it applies per request, not as standing permission, unless they say so explicitly.
- Secrets only in env vars. Never commit `.env`. See `.claude/rules/security.md`.
- Verify before saying done: typecheck, lint, tests, and for UI a manual look on a phone-width viewport.
- Concise commit messages and replies. No inflated language.

## Where to read more
- Architecture and data model: `.claude/docs/architecture-overview.md`
- Business rules: `.claude/docs/business-rules.md`
- Workflow: `.claude/docs/development-workflow.md`
- Rules: `.claude/rules/`
