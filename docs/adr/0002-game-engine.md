# ADR 0002 — Game engine for the MVP

- Status: accepted
- Date: 2026-09-15

## Context

The MVP described in `Decretum_GDD_v1.0.md` needs a server-authoritative monthly decision loop with
data-driven cards, flags, scheduled chains, eight collapse endings, mandate completion, a chronicle and
succession, persisted in PostgreSQL and deterministic under test.

## Decision

- **Pure engine** in `src/domain`: plain functions (`startGame`, `resolveTurn`, `selectCard`,
  `buildSuccessorStart`, `buildGameSummary`) with no I/O. Randomness is injected; production derives a
  PRNG from the government's seed and the month.
- **Content as versioned code** in `src/content` (cards, characters, flags, endings, epithets),
  validated by `src/content/validate.js` against a closed vocabulary: known pillars, known flags,
  whitelisted conditions and three effect operations. Content cannot contain executable values.
- **Content is seeded into PostgreSQL** (`npm run db:seed`, idempotent upsert by slug). At runtime the
  engine reads cards and endings from the database, which is the source of truth. Card choices and
  conditions are JSONB; no card-choice normalization and no CMS.
- **Decision snapshots**: `decisions` stores text, labels, deltas, pillars before/after and flag
  changes, so later content edits never rewrite history.
- **Atomic month**: `POST /decisions` runs in one transaction with `SELECT … FOR UPDATE` on the game,
  `UNIQUE (game_id, turn)` on decisions and an optional client `turn` guard; conflicts return 409.
- **Scheduled events** are identified by a per-government `sequence`, so the engine can create and
  reference them without database-generated ids.
- **Views** (`src/services/gameViews.js`) translate engine state into API responses, including bands
  and trend arrows, so React components contain no game rules.
- **Balance simulator** (`src/simulation`, `npm run simulate`) reuses the same engine; it is a
  development tool and is not shipped in the UI.

Interpretations of the GDD are recorded in `docs/game-rules.md`.

## Consequences

- Adding a card is a data change plus a seed run; the validator catches broken references before
  anything reaches the database.
- New effect or condition types require an engine change and an update to the validator, by design.
- JSONB choices keep queries simple but rely on the validator for structure; the database only
  enforces top-level constraints.
- Node scripts (seed, simulator, Jest global setup) import the same ES modules as the app, so
  `src/domain`, `src/content` and repositories use relative imports.
