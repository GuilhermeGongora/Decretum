# ADR 0001 — Project foundation

- Status: accepted
- Date: 2026-09-14

## Context

We are starting a server-authoritative political card game. Before writing the game engine we need
a stable, simple foundation: runtime, framework, database access, testing and conventions that
keep business rules out of the UI and HTTP layers.

## Decision

- **Runtime**: Node.js 24 LTS (`.nvmrc`), npm, JavaScript only.
- **Framework**: Next.js 16 with the App Router; API routes under `app/api/v1/`.
- **Layering**: `app/` (thin handlers, React) → `src/services` → `src/domain` and
  `src/repositories` → `src/database`. Game rules live only in `src/domain`.
- **Database**: PostgreSQL 17. Local development runs it with Docker Compose while Next.js runs on
  the host. Access through `pg` with one shared pool (`src/database/pool.js`), no ORM.
- **Test database**: integration tests use a separate `politics_game_test` database (created by
  `docker/postgres/init/`, configured in the versioned `.env.test`), never development data.
- **Migrations**: node-pg-migrate, plain JavaScript migration files in `migrations/`.
- **Environment**: Next.js and Jest load `.env` natively; npm scripts for migrations use Node's
  `--env-file-if-exists`. No `dotenv` dependency.
- **Errors**: small hierarchy — `AppError` and `DatabaseError`. Responses never include internal
  error details.
- **Logging**: minimal structured JSON logger over `console` (`src/utils/logger.js`), level from
  `LOG_LEVEL`.
- **Quality**: ESLint (flat config, `eslint-config-next` + `eslint-config-prettier`), Prettier,
  EditorConfig, Jest via `next/jest`. ESLint stays on 9 even though npm already marks
  9.x as no longer supported: `eslint-plugin-react`, `eslint-plugin-jsx-a11y` and
  `eslint-plugin-import`, used by `eslint-config-next`, do not declare ESLint 10 support yet, and
  forcing it would need peer-dependency overrides. ESLint is a dev-only tool, so the risk is low.
  Revisit when `eslint-config-next` supports ESLint 10.
- **Deployment**: local only for now; Vercel is the planned target. `engines.node` is `24.x` to
  match `.nvmrc` and keep Vercel on the same Node major.
- **Git**: Husky hooks, commitlint with Conventional Commits, Commitizen (`npm run commit`).
- **CI**: GitHub Actions on pull requests with a PostgreSQL service container.

## Consequences

- Few dependencies and no ORM: SQL is explicit and must be parameterized by hand.
- Integration tests need a running PostgreSQL (`npm run db:up` locally, service container in CI).
- Adding a layer, a dependency or changing these choices requires a new ADR.
