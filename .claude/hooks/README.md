# Hooks

No hooks are enabled yet. Add them in `.claude/settings.json` under `"hooks"` only when a manual step keeps getting forgotten.

Candidates, in order of value:
1. PostToolUse on Edit/Write for `src/**` and `supabase/**`: run `npx tsc --noEmit` and lint on the changed file.
2. PreToolUse on Bash: block any command containing `git commit`, `git push`, `rm -rf`, `supabase db reset`. These are already denied in settings, but permission patterns match command text and can miss odd forms like `git -C dir commit`; a hook that scans the whole command is the stronger guard.
3. PreToolUse on Edit/Write: block any path matching `.env*`.
4. Stop: remind to run `verify-changes` if source files changed and tests were not run.

Keep hooks fast (under a few seconds) and quiet on success.
