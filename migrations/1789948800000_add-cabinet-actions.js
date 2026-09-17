/**
 * Every change to the cabinet, and where it came from.
 *
 * The Presidency may sign one change a month, and that limit is held here rather than in the
 * interface: a partial unique index over (game_id, turn) for manual actions means two requests
 * racing inside the same month cannot both win, whatever the client believes about its own state.
 *
 * Changes a card forces are recorded with `source = 'decision'` and fall outside that index on
 * purpose. A constitutional consequence is not the president reorganising the government, and it
 * must never be refused because the month's action had already been spent.
 *
 * `previous_character_id` and `next_character_id` are content ids, not foreign keys: the cast lives
 * in `src/content`, never in the database.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE cabinet_actions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
      turn integer NOT NULL CHECK (turn BETWEEN 1 AND 48),
      action text NOT NULL CHECK (action IN ('appoint', 'dismiss', 'replace')),
      ministry_key text NOT NULL,
      previous_character_id text,
      next_character_id text,
      effects jsonb NOT NULL DEFAULT '{}'::jsonb,
      source text NOT NULL CHECK (source IN ('manual', 'decision')),
      created_at timestamptz NOT NULL DEFAULT now(),
      -- An appointment has somebody arriving, a dismissal has somebody leaving, and a replacement
      -- has both. A row with neither would be a change that changed nothing.
      CONSTRAINT cabinet_actions_shape CHECK (
        (action = 'appoint' AND previous_character_id IS NULL AND next_character_id IS NOT NULL)
        OR (action = 'dismiss' AND previous_character_id IS NOT NULL AND next_character_id IS NULL)
        OR (action = 'replace' AND previous_character_id IS NOT NULL
            AND next_character_id IS NOT NULL)
      )
    );

    -- The month's manual action, guaranteed by the database and not by the screen.
    CREATE UNIQUE INDEX cabinet_actions_one_manual_per_turn
      ON cabinet_actions (game_id, turn)
      WHERE source = 'manual';

    -- The archive reads a government's changes in the order they happened.
    CREATE INDEX cabinet_actions_game_idx ON cabinet_actions (game_id, turn);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`DROP TABLE cabinet_actions;`);
};
