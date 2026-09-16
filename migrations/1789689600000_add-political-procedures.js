/**
 * Political procedures: a constitutional process that runs across several months alongside the
 * monthly card loop. Impeachment is the first one; the table is shaped for "a procedure of a type,
 * belonging to a government", not for impeachment alone.
 *
 * It is a table of its own instead of more columns on `games` because a procedure has its own
 * lifecycle, its own resolution and its own history, and a government may have none.
 *
 * The partial unique index is the guarantee the engine relies on: a government can never hold two
 * active procedures of the same type, whatever two concurrent requests try to do.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE political_procedures (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
      type text NOT NULL CHECK (type IN ('impeachment')),
      country_code text NOT NULL CONSTRAINT political_procedures_country_format
        CHECK (country_code ~ '^[A-Z]{2}$'),
      stage text NOT NULL,
      status text NOT NULL CHECK (status IN ('active', 'resolved')),
      grounds text NOT NULL,
      evidence integer NOT NULL CHECK (evidence BETWEEN 0 AND 100),
      support jsonb NOT NULL,
      chamber_votes integer CHECK (chamber_votes BETWEEN 0 AND 513),
      senate_votes integer CHECK (senate_votes BETWEEN 0 AND 81),
      opened_at_turn integer NOT NULL CHECK (opened_at_turn BETWEEN 1 AND 48),
      deadline_turn integer CHECK (deadline_turn BETWEEN 1 AND 54),
      resolution text CHECK (resolution IN ('archived', 'acquitted', 'removed', 'expired')),
      resolved_at_turn integer CHECK (resolved_at_turn BETWEEN 1 AND 48),
      timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT political_procedures_resolved_shape CHECK (
        (status = 'active' AND resolution IS NULL AND resolved_at_turn IS NULL)
        OR (status = 'resolved' AND resolution IS NOT NULL AND resolved_at_turn IS NOT NULL)
      )
    );

    -- One active procedure of a type per government; resolved ones stay for the chronicle.
    CREATE UNIQUE INDEX political_procedures_one_active
      ON political_procedures (game_id, type)
      WHERE status = 'active';

    CREATE INDEX political_procedures_game_idx ON political_procedures (game_id);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`DROP TABLE political_procedures;`);
};
