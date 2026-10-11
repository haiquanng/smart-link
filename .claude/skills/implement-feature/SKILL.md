---
name: implement-feature
description: Implement a feature from a spec with tests and verification. Use after analyze-ticket, or when the task is already clear.
---
# Implement feature

Steps:
1. Confirm there is a spec with acceptance criteria. If not, run `analyze-ticket` first.
2. If the change touches schema, ingest, search or auth, run the `architect` agent and apply its schema edit to `.claude/docs/architecture-overview.md` before coding.
3. Create a branch `feat/<short-name>`.
4. Use the `developer` agent: failing test first for logic, then the smallest implementation. Follow `.claude/rules/`.
5. Run the `verify-changes` skill.
6. Summarize: what changed, files touched, assumptions, what is not done. Offer `code-review`.

Do not expand scope beyond the acceptance criteria. Do not leave TODOs without noting them in the summary.
