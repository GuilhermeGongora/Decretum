const GAME_SELECT = `
  SELECT g.id, g.role, g.status, g.turn, g.start_year, g.people, g.market, g.congress,
         g.institutions, current_card.slug AS current_card_slug, last_card.slug AS last_card_slug,
         g.previous_game_id, g.mandate_completed, g.ending_code, g.simultaneous_ending_codes,
         g.rng_seed, g.created_at, g.updated_at, g.ended_at
    FROM games g
    LEFT JOIN cards current_card ON current_card.id = g.current_card_id
    LEFT JOIN cards last_card ON last_card.id = g.last_card_id`;

function toGame(row) {
  return {
    id: row.id,
    role: row.role,
    status: row.status,
    turn: row.turn,
    startYear: row.start_year,
    meters: {
      people: row.people,
      market: row.market,
      congress: row.congress,
      institutions: row.institutions,
    },
    currentCardSlug: row.current_card_slug,
    lastCardSlug: row.last_card_slug,
    previousGameId: row.previous_game_id,
    mandateCompleted: row.mandate_completed,
    endingCode: row.ending_code,
    simultaneousEndingCodes: row.simultaneous_ending_codes,
    rngSeed: row.rng_seed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    endedAt: row.ended_at,
  };
}

export async function findGameById(client, id, { forUpdate = false } = {}) {
  const { rows } = await client.query(
    `${GAME_SELECT} WHERE g.id = $1 ${forUpdate ? "FOR UPDATE OF g" : ""}`,
    [id],
  );
  return rows.length > 0 ? toGame(rows[0]) : null;
}

export async function insertGame(client, { state, startYear }) {
  const { rows } = await client.query(
    `INSERT INTO games (role, status, turn, start_year, people, market, congress, institutions,
                        current_card_id, last_card_id, previous_game_id, mandate_completed,
                        ending_code, simultaneous_ending_codes, rng_seed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
             (SELECT id FROM cards WHERE slug = $9),
             (SELECT id FROM cards WHERE slug = $10),
             $11, $12, $13, $14, $15)
     RETURNING id`,
    [
      state.role,
      state.status,
      state.turn,
      startYear,
      state.meters.people,
      state.meters.market,
      state.meters.congress,
      state.meters.institutions,
      state.currentCardSlug,
      state.lastCardSlug,
      state.previousGameId,
      state.mandateCompleted,
      state.endingCode,
      state.simultaneousEndingCodes,
      state.rngSeed,
    ],
  );
  return rows[0].id;
}

export async function updateGame(client, id, state) {
  await client.query(
    `UPDATE games
        SET status = $2::text,
            turn = $3,
            people = $4,
            market = $5,
            congress = $6,
            institutions = $7,
            current_card_id = (SELECT id FROM cards WHERE slug = $8),
            last_card_id = (SELECT id FROM cards WHERE slug = $9),
            mandate_completed = $10,
            ending_code = $11,
            simultaneous_ending_codes = $12,
            updated_at = now(),
            ended_at = CASE WHEN $2::text = 'active' THEN NULL ELSE now() END
      WHERE id = $1`,
    [
      id,
      state.status,
      state.turn,
      state.meters.people,
      state.meters.market,
      state.meters.congress,
      state.meters.institutions,
      state.currentCardSlug,
      state.lastCardSlug,
      state.mandateCompleted,
      state.endingCode,
      state.simultaneousEndingCodes,
    ],
  );
}
