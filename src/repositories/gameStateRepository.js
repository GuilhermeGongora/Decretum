// Per-government state: flags, scheduled events and card appearances.

export async function findFlags(client, gameId) {
  const { rows } = await client.query(
    `SELECT key, value, label, legacy, legacy_priority, successor_effects, set_at_turn,
            expires_at_turn, inherited
       FROM game_flags
      WHERE game_id = $1
      ORDER BY key`,
    [gameId],
  );

  return Object.fromEntries(
    rows.map((row) => [
      row.key,
      {
        value: row.value,
        label: row.label,
        legacy: row.legacy,
        legacyPriority: row.legacy_priority,
        successorEffects: row.successor_effects,
        setAtTurn: row.set_at_turn,
        expiresAtTurn: row.expires_at_turn,
        inherited: row.inherited,
      },
    ]),
  );
}

// The engine returns the full flag map for the turn, so the stored set is replaced atomically.
export async function replaceFlags(client, gameId, flags) {
  await client.query(`DELETE FROM game_flags WHERE game_id = $1`, [gameId]);

  for (const [key, flag] of Object.entries(flags)) {
    await client.query(
      `INSERT INTO game_flags (game_id, key, value, label, legacy, legacy_priority,
                               successor_effects, set_at_turn, expires_at_turn, inherited)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        gameId,
        key,
        JSON.stringify(flag.value),
        flag.label,
        flag.legacy,
        flag.legacyPriority,
        flag.successorEffects === null ? null : JSON.stringify(flag.successorEffects),
        flag.setAtTurn,
        flag.expiresAtTurn,
        flag.inherited,
      ],
    );
  }
}

export async function findScheduledEvents(client, gameId) {
  const { rows } = await client.query(
    `SELECT e.sequence, c.slug AS card_slug, e.turn_due, e.priority, e.status, e.created_at_turn
       FROM scheduled_events e
       JOIN cards c ON c.id = e.card_id
      WHERE e.game_id = $1
      ORDER BY e.sequence`,
    [gameId],
  );

  return rows.map((row) => ({
    sequence: row.sequence,
    cardSlug: row.card_slug,
    turnDue: row.turn_due,
    priority: row.priority,
    status: row.status,
    createdAtTurn: row.created_at_turn,
  }));
}

export async function insertScheduledEvents(client, gameId, events) {
  for (const event of events) {
    await client.query(
      `INSERT INTO scheduled_events (game_id, sequence, card_id, turn_due, priority, status,
                                     created_at_turn)
       VALUES ($1, $2, (SELECT id FROM cards WHERE slug = $3), $4, $5, $6, $7)`,
      [
        gameId,
        event.sequence,
        event.cardSlug,
        event.turnDue,
        event.priority,
        event.status,
        event.createdAtTurn,
      ],
    );
  }
}

export async function updateScheduledEventStatus(client, gameId, sequences, status) {
  if (sequences.length === 0) return;
  await client.query(
    `UPDATE scheduled_events
        SET status = $3, updated_at = now()
      WHERE game_id = $1 AND sequence = ANY($2::int[])`,
    [gameId, sequences, status],
  );
}

export async function findAppearances(client, gameId) {
  const { rows } = await client.query(
    `SELECT a.turn, c.slug AS card_slug
       FROM card_appearances a
       JOIN cards c ON c.id = a.card_id
      WHERE a.game_id = $1
      ORDER BY a.turn`,
    [gameId],
  );
  return rows.map((row) => ({ turn: row.turn, cardSlug: row.card_slug }));
}

export async function insertAppearance(client, gameId, { turn, cardSlug }) {
  await client.query(
    `INSERT INTO card_appearances (game_id, turn, card_id)
     VALUES ($1, $2, (SELECT id FROM cards WHERE slug = $3))`,
    [gameId, turn, cardSlug],
  );
}
