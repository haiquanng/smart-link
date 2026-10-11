---
name: fix-bug
description: Reproduce, fix and prove a bug with a regression test. Use for bug reports and unexpected behavior.
---
# Fix bug

Steps:
1. Restate the bug: expected vs actual, and the steps or input that trigger it.
2. Find the cause by reading code and, if needed, running it. State the root cause in one or two sentences before changing anything.
3. Write a failing test that reproduces it (`test-engineer` agent). Run it and confirm it fails for the right reason.
4. Make the smallest fix. No refactors in the same change.
5. Confirm the new test passes, then run `verify-changes`.
6. Report: root cause, the fix, the test added, any related risk noticed but not changed.

If the bug cannot be reproduced, say so and list what was tried instead of guessing a fix.
