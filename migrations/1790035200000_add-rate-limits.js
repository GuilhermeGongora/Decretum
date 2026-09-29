/**
 * How often one client may write.
 *
 * The game has no accounts, so the only thing a limit can be keyed to is the address a request
 * arrives from. The counters live in the database rather than in memory because a serverless
 * deployment runs many instances at once, and a counter held in one process would only ever see the
 * fraction of the traffic that happened to reach it.
 *
 * Fixed windows, with the window as part of the key: a new window is simply a new row, so nothing
 * has to be reset on a schedule. `expires_at` exists only so old rows can be swept.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE rate_limits (
      bucket text PRIMARY KEY,
      hits integer NOT NULL CHECK (hits > 0),
      expires_at timestamptz NOT NULL
    );

    CREATE INDEX rate_limits_expires_at_idx ON rate_limits (expires_at);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`DROP TABLE rate_limits;`);
};
