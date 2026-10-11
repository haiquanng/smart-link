---
name: code-review
description: Review the current diff against project rules, business rules and security. Use before merging or when asked to review.
---
# Code review

Steps:
1. Collect the change: `git diff` and `git diff --staged`. If the user names a branch, diff against `main`.
2. Run the `code-reviewer` agent on it.
3. Verify each finding against the code before reporting. Drop any you cannot support with a concrete failing scenario.
4. Report ranked by severity: file and line, problem, scenario, fix.
5. End with one line: ready to merge, or blocked and why.

Review only. Do not edit files unless the user asks to apply fixes.
