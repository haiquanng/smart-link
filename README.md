# Smart Link

Personal link vault: save links and screenshots from Facebook, Instagram, Threads, Substack with one tap and a short note, then find them again by plain-language search. PWA, iPhone first, Supabase backend.

## Status
Planning. See `.claude/docs/development-workflow.md` for phases. Start with Phase 0: prove the iOS Shortcut can send a Facebook share to an endpoint.

## Working with Claude Code
Open this folder in VS Code, start Claude Code, and run in order:
1. "Scaffold the project per CLAUDE.md: Vite + React + TS + Tailwind + vite-plugin-pwa, add `typecheck`, `lint`, `test` scripts, `.env.example`."
2. `/analyze-ticket Phase 0: iOS Shortcut spike`
3. `/implement-feature` for each phase, then `/verify-changes` and `/code-review`.

Context lives in `CLAUDE.md` and `.claude/`.
