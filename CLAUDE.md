@AGENTS.md

# Claude Code orchestration

The main Claude Code session is the **orchestrator**. There is no orchestrator subagent.

## Role of the main session

- Owns the conversation with the developer: clarifies intent, states a short plan, reports results.
- Breaks work into steps and decides, per step, whether to do it directly or delegate.
- Integrates subagent output, resolves conflicts between their recommendations and keeps the
  final decision aligned with `AGENTS.md`.
- Runs the verification commands and reports real results.
- Stops at the boundary of the requested task. Never advances to the next roadmap stage on its own.

## Subagents (`.claude/agents/`)

| Agent               | Delegate when                                                                     |
| ------------------- | --------------------------------------------------------------------------------- |
| `architect`         | New module/boundary, new dependency, structural change, suspected overengineering |
| `game-engine`       | Rules, cards, turns, pillars, flags, endings, succession (only when requested)    |
| `database-engineer` | Migrations, indexes, queries, transactions, locking, pooling                      |
| `test-engineer`     | Writing tests first (TDD), integration tests, edge cases, determinism             |
| `code-reviewer`     | After any substantial change, before reporting the task as done                   |

## Delegation guidelines

- Delegate proportionally. Trivial edits (typos, one-line config) are done directly.
- Give each subagent a self-contained brief: goal, relevant files, constraints, expected output.
  Subagents start without this conversation's context.
- Typical flow for a feature:
  1. `architect` validates the approach when boundaries or dependencies change.
  2. `test-engineer` writes failing tests describing the behavior.
  3. `game-engine` / `database-engineer` implement until tests pass.
  4. `code-reviewer` reviews the diff.
  5. The main session runs lint, format check, tests and build, then reports.
- Independent subagent tasks may run in parallel; tasks touching the same files may not.
- Subagent findings are advice. Verify claims before acting on them.

## Communication

- The developer writes in Portuguese; reply in Portuguese. Code, identifiers, commits and
  repository docs are in English.
- Do not create commits unless explicitly asked. Suggest `npm run commit` instead.

## Product documentation

For game rules, read:

- docs/product/Decretum_GDD_v1.0.md

For UI, countries, and modern politics, read:

- docs/product/Decretum_UI_Modern_Politics_Playbook_v1.0.md

Read only the document relevant to the current task unless both are explicitly requested.
