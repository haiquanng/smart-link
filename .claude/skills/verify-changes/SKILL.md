---
name: verify-changes
description: Run typecheck, lint and tests and check the change against its acceptance criteria. Use before saying a task is done.
---
# Verify changes

Steps:
1. Run `npm run typecheck`, `npm run lint`, `npm run test`. If a script does not exist yet, say so and run what does.
2. For UI changes, run the dev server and check at a 390px viewport: loading, empty and error states, tap targets at least 44px.
3. For ingest or search changes, exercise the real path with a sample payload from `tests/fixtures/` and confirm: the item is saved, a failed fetch does not block it, a duplicate URL does not create a second row, a no-diacritics query finds it.
4. Walk through each acceptance criterion and mark pass or fail with evidence.
5. Report results plainly. If anything fails or was not run, say so. Never claim done on unrun checks.
