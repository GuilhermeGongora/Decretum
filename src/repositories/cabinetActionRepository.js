const ACTION_SELECT = `
  SELECT id, turn, action, ministry_key, previous_character_id, next_character_id, effects, source,
         created_at
    FROM cabinet_actions`;

function toCabinetAction(row) {
  return {
    id: row.id,
    turn: row.turn,
    action: row.action,
    ministryKey: row.ministry_key,
    previousCharacterId: row.previous_character_id,
    nextCharacterId: row.next_character_id,
    effects: row.effects,
    source: row.source,
  };
}

// Everything that ever happened to this government's cabinet, oldest first: the archive reads them
// in the order they were signed.
export async function findCabinetActions(client, gameId) {
  const { rows } = await client.query(
    `${ACTION_SELECT} WHERE game_id = $1 ORDER BY turn, created_at`,
    [gameId],
  );
  return rows.map(toCabinetAction);
}

/**
 * How many changes the Presidency has already signed this month. Read inside the decision's own
 * transaction, under the game row lock — the partial unique index is what actually refuses a second
 * one, and this only lets the service say why before the database has to.
 */
export async function countManualActionsAtTurn(client, gameId, turn) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS used
       FROM cabinet_actions
      WHERE game_id = $1 AND turn = $2 AND source = 'manual'`,
    [gameId, turn],
  );
  return rows[0].used;
}

/**
 * Records one change. `source` separates what the president signed from what a card forced: only the
 * former is limited to one a month, and only the former is refused by the unique index.
 */
export async function insertCabinetAction(client, gameId, action, source) {
  const { rows } = await client.query(
    `INSERT INTO cabinet_actions (game_id, turn, action, ministry_key, previous_character_id,
                                  next_character_id, effects, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      gameId,
      action.turn,
      action.action,
      action.ministryKey,
      action.previousCharacterId,
      action.nextCharacterId,
      JSON.stringify(action.effects ?? {}),
      source,
    ],
  );
  return rows[0].id;
}
