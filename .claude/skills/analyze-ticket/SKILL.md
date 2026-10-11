---
name: analyze-ticket
description: Turn a request, idea or bug report into a short spec with acceptance criteria. Use at the start of any non-trivial task.
---
# Analyze ticket

Input: the user's request or a ticket text.

Steps:
1. Read `CLAUDE.md` and `.claude/docs/business-rules.md`. If schema, ingest, search or auth is involved, also read `.claude/docs/architecture-overview.md`.
2. Use the `analyst` agent to produce the spec.
3. If the request conflicts with a product decision in `CLAUDE.md`, stop and report the conflict.
4. Present: goal, acceptance criteria checklist, affected business rules, edge cases, assumptions.
5. Ask a question only when the answer changes what gets built. Otherwise state the assumption and proceed.

Output stays under one screen. Do not write code in this skill.
