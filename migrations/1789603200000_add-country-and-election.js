/**
 * Multi-country foundation (ADR 0003). A government belongs to a country and may have been won in an
 * electoral prologue.
 *
 * `country_code` references a country pack resolved in code, so the institutional profile is never
 * copied per game. Governments created before this migration are Brazilian: Brazil is the only
 * playable pack, and the deck they were played with is the Brazilian one.
 *
 * `candidate` and `election` are immutable snapshots written once at creation, like decision
 * snapshots. They stay null for governments started without a prologue (an empty POST body, and every
 * government created before this migration).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE games
      ADD COLUMN country_code text NOT NULL DEFAULT 'BR'
        CONSTRAINT games_country_code_format CHECK (country_code ~ '^[A-Z]{2}$'),
      ADD COLUMN candidate jsonb,
      ADD COLUMN election jsonb;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE games
      DROP COLUMN election,
      DROP COLUMN candidate,
      DROP COLUMN country_code;
  `);
};
