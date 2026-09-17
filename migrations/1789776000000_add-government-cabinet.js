/**
 * The cabinet a government holds: one row per ministry the country declares, held or vacant.
 *
 * A table of its own rather than columns on `games` because the set of ministries belongs to the
 * country pack and differs between packs, and because a seat has a small history of its own — who
 * holds it, how loyal they are, and since when.
 *
 * `holder_character_id` is a content id, not a foreign key: the cast lives in `src/content`, never in
 * the database. A vacant seat is a row with no holder and no loyalty, which is a real state and not a
 * gap: a government can take office, or be left, without a Justice minister.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE cabinet_seats (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
      portfolio text NOT NULL,
      holder_character_id text,
      loyalty integer CHECK (loyalty BETWEEN 0 AND 100),
      since_turn integer NOT NULL CHECK (since_turn BETWEEN 1 AND 48),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      -- A seat is either held by someone with a loyalty, or empty of both. There is no such thing as
      -- a vacant chair that is still loyal, or a minister nobody has an opinion about.
      CONSTRAINT cabinet_seats_vacancy_shape CHECK (
        (holder_character_id IS NOT NULL AND loyalty IS NOT NULL)
        OR (holder_character_id IS NULL AND loyalty IS NULL)
      )
    );

    -- A government holds each ministry exactly once. This also serves every lookup by game.
    CREATE UNIQUE INDEX cabinet_seats_one_per_portfolio ON cabinet_seats (game_id, portfolio);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`DROP TABLE cabinet_seats;`);
};
