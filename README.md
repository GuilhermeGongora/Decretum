# Politics Game

A server-authoritative political card game. Players make decisions through cards; the server
computes every consequence.

> **Current stage: project foundation.** This repository currently contains only the technical
> foundation (framework, database infrastructure, tooling, CI and a health endpoint). The game
> engine has not been implemented yet.

## Stack

| Concern         | Choice                                               |
| --------------- | ---------------------------------------------------- |
| Runtime         | Node.js 24 LTS, npm                                  |
| Language        | JavaScript (no TypeScript)                           |
| Web framework   | Next.js 16 (App Router), React 19                    |
| Database        | PostgreSQL 17 (Docker Compose for local development) |
| DB access       | `pg` with a shared connection pool                   |
| Migrations      | node-pg-migrate                                      |
| Tests           | Jest (unit + integration)                            |
| Quality         | ESLint, Prettier, EditorConfig                       |
| Git conventions | Husky, commitlint (Conventional Commits), Commitizen |
| CI              | GitHub Actions (pull requests, PostgreSQL service)   |

Project rules live in [AGENTS.md](AGENTS.md). Architecture decisions live in [docs/adr/](docs/adr/).

## Project structure

```
app/                  Next.js App Router (pages and thin HTTP route handlers)
  api/v1/health/      GET /api/v1/health
src/
  database/           PostgreSQL pool
  errors/             AppError, DatabaseError
  repositories/       All database access
  services/           Use-case orchestration
  utils/              Structured logger
tests/
  unit/               No database or network
  integration/        Real PostgreSQL / route handlers
migrations/           node-pg-migrate migrations
docker/postgres/init/ SQL run when the local PostgreSQL volume is first created
docs/adr/             Architecture decision records
.claude/agents/       Claude Code subagents
.github/workflows/    CI
```

`src/domain/` (game rules) and `seeds/` will be created when there is content for them.

## Requirements

- Node.js 24 (see `.nvmrc`)
- npm 10+
- Docker with Docker Compose v2
- Git

## Setup

### 1. Node.js with NVM

macOS / Linux ([nvm](https://github.com/nvm-sh/nvm)):

```bash
nvm install   # reads .nvmrc
nvm use
```

Windows ([nvm-windows](https://github.com/coreybutler/nvm-windows)) does not read `.nvmrc`, so pass
the version explicitly:

```powershell
nvm install 24
nvm use 24
```

### 2. Install dependencies

```bash
npm install
```

This also installs the Git hooks (Husky) through the `prepare` script.

### 3. Environment variables

```bash
cp .env.example .env
```

| Variable       | Description                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string. The example matches `compose.yaml`.                                           |
| `NODE_ENV`     | `development` locally. Next.js sets it automatically for dev/build.                                         |
| `LOG_LEVEL`    | Optional. `debug`, `info`, `warn`, `error` or `silent`. Defaults to `info`, or `silent` when running tests. |

`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` and `POSTGRES_PORT` optionally override the
Docker Compose defaults. If you change them, update `DATABASE_URL` accordingly.

`.env` is git-ignored. The credentials in `.env.example` and `compose.yaml` are for local
development only.

`.env.test` is versioned and points tests to a separate `politics_game_test` database, so tests never
touch development data. Jest loads it with priority over `.env`; variables already present in the
environment (as in CI) win over both files.

### 4. Start PostgreSQL

```bash
npm run db:up     # docker compose up -d --wait postgres
npm run db:down   # stop and remove the container (data stays in the volume)
```

On the first start (empty volume) the container also creates the `politics_game_test` database
(`docker/postgres/init/`). If your volume was created before that script existed, create it once:

```bash
docker compose exec postgres psql -U politics -d postgres -c "CREATE DATABASE politics_game_test"
```

To wipe local data completely: `docker compose down -v`.

### 5. Migrations

```bash
npm run db:migrate                          # apply pending migrations
npm run db:rollback                         # revert the last migration
npm run db:migrate:test                     # apply pending migrations to the test database
npm run db:create-migration -- create-users # create migrations/<timestamp>_create-users.js
```

There are no schema migrations yet.

### 6. Run the application

```bash
npm run dev
```

Check the health endpoint:

```bash
curl -i http://localhost:3000/api/v1/health
```

- `200 {"status":"ok","database":"ok"}` when PostgreSQL is reachable
- `503 {"status":"error","database":"unavailable"}` when it is not

## Tests

```bash
npm test                  # all tests (integration tests need PostgreSQL running)
npm run test:unit         # unit tests only, no database needed
npm run test:integration  # integration tests only
npm run test:watch        # watch mode
```

Integration tests use the `politics_game_test` database configured in `.env.test`. Once schema
migrations exist, run `npm run db:migrate:test` before the integration tests.

## Lint and formatting

```bash
npm run lint           # ESLint
npm run lint:fix
npm run format         # Prettier (write)
npm run format:check
```

## Build

```bash
npm run build
npm run start
```

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are validated by
commitlint on `commit-msg`. The `pre-commit` hook runs lint and the format check.

```bash
git add <files>
npm run commit   # interactive Commitizen prompt
```

## CI

`.github/workflows/ci.yml` runs on every pull request: `npm ci`, lint, format check, migrations,
tests (with a PostgreSQL service container) and build.

## Deployment

For now the project runs locally only (Next.js on the host, PostgreSQL in Docker). Vercel is the
planned deployment target; `engines.node` is pinned to `24.x` so Vercel uses the same Node major as
`.nvmrc`.
