# Coding standards

- TypeScript strict mode. No `any`; use `unknown` and narrow.
- React function components and hooks. Server state via TanStack Query; local UI state via `useState`. No global store until needed.
- Validate every external input (API body, edge function payload, env) with Zod.
- Files under ~200 lines. One component per file. Name files after what they export.
- No dead code, no commented-out code, no TODO without an issue or a note in `.claude/docs/development-workflow.md`.
- Comments explain why, not what.
- Prefer small pure functions for logic (URL cleaning, query building, ranking) so they are unit-testable.
- Vietnamese user-facing strings live in one `src/i18n/vi.ts` map. No hardcoded UI text in components.
- Handle loading, empty, and error states for every screen. Mobile-first: design at 390px width, tap targets at least 44px.
- Dates stored as UTC `timestamptz`, shown in the user's timezone.
- Imports: absolute alias `@/` for `src/`.
