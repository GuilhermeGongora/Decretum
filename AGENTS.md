# AGENTS.md — Decretum Project Constitution

These rules apply to every contributor, human or AI. When a rule conflicts with a convenience, the
rule wins. Changing a rule requires an ADR in `docs/adr/`.

## Language and tooling

- JavaScript only. No TypeScript.
- Node.js (version pinned in `.nvmrc`) and npm. No yarn, pnpm or bun.
- `package-lock.json` is committed. CI installs with `npm ci`.
- Next.js (App Router) + React. See the Next.js agent rules block at the end of this file.
- Avoid unnecessary dependencies. Prefer the platform (Node, Web APIs, `pg`) over new packages.
  Every new dependency must be justified.

## Architecture

- Prefer simple solutions. Build the smallest correct thing.
- Layers and allowed dependencies (arrows point to what a layer may import):

  ```
  app/ (HTTP route handlers, React)  ->  src/services  ->  src/domain
                                                     \->  src/repositories  ->  src/database
  ```

- `app/api/**` route handlers are thin: parse input, call a service, map the result to HTTP.
  No business rules, no SQL.
- `src/domain/` holds game rules as plain, pure JavaScript. It never imports React, Next.js, `pg`,
  or anything from `app/`.
- `src/services/` orchestrates use cases: loads state through repositories, applies domain rules,
  persists results, owns transaction boundaries.
- `src/repositories/` is the only place that talks to the database.
- `src/database/` holds connection/pool infrastructure only.
- `src/errors/` holds application errors (`AppError` and subclasses). Keep the hierarchy small.
- `src/utils/` holds generic helpers (e.g. the structured logger). No game logic.
- React components never contain core game rules.

## Database

- PostgreSQL is the source of truth.
- Every schema change is a migration in `migrations/` (node-pg-migrate). Never edit a migration
  that has been merged; add a new one.
- All SQL is parameterized (`$1, $2, ...`). Never interpolate values into SQL strings.
- Atomic game decisions run inside a transaction.
- Never expose connection strings, SQL errors or stack traces in HTTP responses.

## Game

- The server is authoritative. Never accept game effects, scores or outcomes calculated by the client;
  the client sends intentions, the server computes consequences.
- Game content (cards, effects, conditions, endings) is data-driven.
- The engine interprets data. Avoid card-specific conditionals inside the engine.
- Randomness is injected (seeded RNG or a provided function) so behavior is deterministic and testable.

## Testing

- Jest. BDD-style descriptions (`describe("when ...")`, `it("does ...")`).
- Domain behavior is developed test-first (TDD).
- Unit tests live in `tests/unit/`, integration tests (real PostgreSQL, HTTP handlers) in
  `tests/integration/`.
- Integration tests use the `decretum_test` database (`.env.test`), never the development database.
- Never write flaky or probabilistic tests. Control time and randomness explicitly.
- Do not write artificial tests just to raise coverage.

## Scope

- Do not implement roadmap features without an explicit request.
- Do not redesign unrelated code.
- Do not create empty files or placeholder directories "for later".

## Git

- Conventional Commits, enforced by commitlint. Use `npm run commit`.
- Never commit `.env` or real secrets.
- Do not commit on behalf of the developer unless explicitly asked.

## Definition of done

Before declaring substantial work complete, actually run and report:

```
npm run lint
npm run format:check
npm test          # needs PostgreSQL: npm run db:up && npm run db:migrate:test
npm run build
```

Do not claim something works without verifying it when verification is possible.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
