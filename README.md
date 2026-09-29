# DECRETUM

> _Salus Populi Suprema Lex_ — "the welfare of the people shall be the supreme law."

A server-authoritative political card game in Brazilian Portuguese, with a Latin, Roman-inspired
tone. You are elected President of Brazil and govern for 48 months; each month a dossier brings a
dilemma, and every decision shifts four pillars of power: **Povo, Mercado, Congresso e
Instituições**. Both extremes of any pillar end the government.

The campaign can be lost before the mandate begins. Ministers are appointed and dismissed at a
political cost, Congress can open an impeachment and remove the president, and the Supreme Court
rules on the record the government leaves behind.

The game design is defined in [Decretum_GDD_v1.0.md](Decretum_GDD_v1.0.md). Implementation choices
where the GDD needed interpretation are recorded in [docs/game-rules.md](docs/game-rules.md).

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
app/                     Next.js App Router
  _components/           React UI (no game rules)
  _lib/                  API client, local preferences, pt-BR presentation text
  api/v1/                Thin HTTP route handlers
src/
  domain/                Pure game engine: effects, endings, flags, selection, turns, score, succession
  content/               The cards, characters, flags, endings and epithets + content validator
  services/              Use cases (transactions) and API views
  repositories/          All SQL
  database/              Pool and transaction helper
  http/                  Response and payload helpers
  errors/                AppError hierarchy
  simulation/            Balance simulator (development tool)
  utils/                 Structured logger
seeds/                   Loads content into PostgreSQL
scripts/                 Developer scripts (simulator CLI)
migrations/              node-pg-migrate migrations
tests/unit/              Domain, content and simulation tests
tests/integration/       API tests against a real PostgreSQL
docker/postgres/init/    SQL run when the local PostgreSQL volume is first created
docs/                    ADRs and game-rule interpretations
```

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

`.env.test` is versioned and points tests to a separate `decretum_test` database, so tests never
touch development data. Jest loads it with priority over `.env`; variables already present in the
environment (as in CI) win over both files.

### 4. Start PostgreSQL

```bash
npm run db:up     # docker compose up -d --wait postgres
npm run db:down   # stop and remove the container (data stays in the volume)
```

On the first start (empty volume) the container also creates the `decretum_test` database
(`docker/postgres/init/`). If your volume was created before that script existed, create it once:

```bash
docker compose exec postgres psql -U decretum -d postgres -c "CREATE DATABASE decretum_test"
```

To wipe local data completely: `docker compose down -v`.

### 5. Migrations and game content

```bash
npm run db:migrate                          # apply pending migrations
npm run db:seed                             # load/update the cards and endings (idempotent)
npm run db:rollback                         # revert the last migration
npm run db:create-migration -- add-something # create migrations/<timestamp>_add-something.js
```

Game content lives in `src/content`. After changing it, run `npm run db:seed` again; the seed
validates every card before writing and prints editorial-guideline warnings.

The integration test suite migrates and seeds the test database automatically. To do it by hand:
`npm run db:migrate:test && npm run db:seed:test`.

### 6. Run the application

```bash
npm run dev
```

Open http://localhost:3000 to play. The current government id is kept in the browser, so reloading
returns to the same month and card.

## API

Base path: `/api/v1`. The server calculates every effect; the client sends only its choice.

| Method | Path                   | Description                                                 |
| ------ | ---------------------- | ----------------------------------------------------------- |
| GET    | `/health`              | Application and database health                             |
| POST   | `/games`               | Create a government and its first card (201)                |
| GET    | `/games/:id`           | Current state and card, or ending and summary when finished |
| POST   | `/games/:id/decisions` | Body `{ "choice": "left" \| "right", "turn": 1 }`           |
| GET    | `/games/:id/chronicle` | Decision history and inherited legacies                     |
| POST   | `/games/:id/successor` | Start a successor after a finished government (201)         |

Errors use `{ "error": { "code", "message" } }`: 400 invalid payload, 404 not found, 409 month
already decided / government ended / successor exists, 422 invalid choice, 500 unexpected.

## Tests

```bash
npm test                  # unit + integration (integration needs PostgreSQL running)
npm run test:unit         # unit tests only, no database needed
npm run test:integration  # integration tests only
npm run test:watch        # watch mode
```

## Balance simulator

```bash
npm run simulate                                   # 1000 games for each policy
npm run simulate -- --games 5000 --policy random   # one policy
npm run simulate -- --json                         # machine-readable report
```

Policies: `random`, `center`, `favor_people`, `favor_market`, `favor_congress`,
`favor_institutions`, `alternate`. The report covers duration, completion rate, endings, card
frequency, choices and fallback selections.

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
