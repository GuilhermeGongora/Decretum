const CABINET_SELECT = `
  SELECT portfolio, holder_character_id, loyalty, since_turn
    FROM cabinet_seats`;

function toStoredSeat(row) {
  return {
    portfolio: row.portfolio,
    holder: row.holder_character_id,
    loyalty: row.loyalty,
    sinceTurn: row.since_turn,
  };
}

/**
 * The seats as they were stored, without the ministry's name: that belongs to the country pack, and
 * copying it into the database would be a second, staler source of truth. The domain rebuilds the
 * cabinet against the country, which is also what makes a government created before this table
 * playable — it simply has no rows yet.
 */
export async function findCabinetSeats(client, gameId) {
  const { rows } = await client.query(`${CABINET_SELECT} WHERE game_id = $1 ORDER BY portfolio`, [
    gameId,
  ]);
  return rows.map(toStoredSeat);
}

// The engine returns the whole cabinet for the month, so the stored seats are replaced atomically,
// the same way the flag set is.
export async function replaceCabinetSeats(client, gameId, cabinet) {
  await client.query(`DELETE FROM cabinet_seats WHERE game_id = $1`, [gameId]);

  for (const seat of cabinet?.seats ?? []) {
    await client.query(
      `INSERT INTO cabinet_seats (game_id, portfolio, holder_character_id, loyalty, since_turn)
       VALUES ($1, $2, $3, $4, $5)`,
      [gameId, seat.portfolio, seat.holder, seat.loyalty, seat.sinceTurn],
    );
  }
}
