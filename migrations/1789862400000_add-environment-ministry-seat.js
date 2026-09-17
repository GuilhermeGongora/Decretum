/**
 * The Brazilian pack gained a seventh portfolio — Meio Ambiente — when the cabinet became playable.
 * Governments that took office before it hold six seats, and the engine would already show the new
 * ministry as vacant, because a declared ministry with no stored seat is vacant by rule. But the
 * stored set would only catch up on the next decision, and the database should not need content to
 * be replayed in order to become correct.
 *
 * This backfills that one chair, and nothing else:
 *
 * - Only Brazilian governments, because only that pack declares the ministry. A null country_code is
 *   Brazil, as it is everywhere else in the engine.
 * - Only governments that already hold a cabinet. A government created before `cabinet_seats`
 *   existed has no rows at all, and giving it a single vacant chair would be actively harmful: the
 *   engine would read "seats are stored" and hand it seven empty ministries instead of the cabinet
 *   its country describes.
 * - Never an existing row. A minister who was handed over stays gone, and a chair somebody emptied
 *   stays empty.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO cabinet_seats (game_id, portfolio, holder_character_id, loyalty, since_turn)
    SELECT g.id, 'meio_ambiente', NULL, NULL, 1
      FROM games g
     WHERE COALESCE(g.country_code, 'BR') = 'BR'
       AND EXISTS (SELECT 1 FROM cabinet_seats s WHERE s.game_id = g.id)
       AND NOT EXISTS (
             SELECT 1 FROM cabinet_seats s
              WHERE s.game_id = g.id AND s.portfolio = 'meio_ambiente'
           );
  `);
};

/**
 * Removing the portfolio removes its chairs. Nobody ever held one: the backfill only ever inserted
 * vacancies, and a government that appointed someone to it did so after this migration ran.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`DELETE FROM cabinet_seats WHERE portfolio = 'meio_ambiente';`);
};
