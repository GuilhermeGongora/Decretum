/**
 * Stores the authored consequence each decision showed (newspaper headline and character reaction) as
 * part of the immutable decision snapshot. Nullable: decisions recorded before this migration, or on
 * cards without authored consequences, keep null and the chronicle shows their result text.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE decisions ADD COLUMN consequence jsonb;

    -- COALESCE turns a missing key (NULL) into false: a CHECK only rejects false, never NULL.
    ALTER TABLE decisions ADD CONSTRAINT decisions_consequence_shape CHECK (
      consequence IS NULL OR (
        jsonb_typeof(consequence) = 'object'
        AND COALESCE(jsonb_typeof(consequence -> 'headline') = 'string', false)
        AND COALESCE(jsonb_typeof(consequence -> 'reaction') = 'string', false)
        AND COALESCE(btrim(consequence ->> 'headline') <> '', false)
        AND COALESCE(btrim(consequence ->> 'reaction') <> '', false)
      )
    );
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`ALTER TABLE decisions DROP COLUMN consequence;`);
};
