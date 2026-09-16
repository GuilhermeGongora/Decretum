const PROCEDURE_SELECT = `
  SELECT id, game_id, type, country_code, stage, status, grounds, evidence, support,
         chamber_votes, senate_votes, opened_at_turn, deadline_turn, resolution, resolved_at_turn,
         timeline, created_at, updated_at
    FROM political_procedures`;

function toProcedure(row) {
  return {
    id: row.id,
    gameId: row.game_id,
    type: row.type,
    countryCode: row.country_code,
    stage: row.stage,
    status: row.status,
    grounds: row.grounds,
    evidence: row.evidence,
    support: row.support,
    chamberVotes: row.chamber_votes,
    senateVotes: row.senate_votes,
    openedAtTurn: row.opened_at_turn,
    deadlineTurn: row.deadline_turn,
    resolution: row.resolution,
    resolvedAtTurn: row.resolved_at_turn,
    timeline: row.timeline,
  };
}

// The active procedure is read inside the decision transaction, under the game row lock.
export async function findActiveProcedure(client, gameId, { forUpdate = false } = {}) {
  const { rows } = await client.query(
    `${PROCEDURE_SELECT} WHERE game_id = $1 AND status = 'active' ${forUpdate ? "FOR UPDATE" : ""}`,
    [gameId],
  );
  return rows.length > 0 ? toProcedure(rows[0]) : null;
}

export async function findProcedures(client, gameId) {
  const { rows } = await client.query(
    `${PROCEDURE_SELECT} WHERE game_id = $1 ORDER BY opened_at_turn, created_at`,
    [gameId],
  );
  return rows.map(toProcedure);
}

// The partial unique index refuses a second active procedure of the same type; the service turns that
// violation into a conflict instead of letting two petitions exist.
export async function insertProcedure(client, gameId, procedure) {
  const { rows } = await client.query(
    `INSERT INTO political_procedures (game_id, type, country_code, stage, status, grounds, evidence,
                                       support, chamber_votes, senate_votes, opened_at_turn,
                                       deadline_turn, timeline)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [
      gameId,
      procedure.type,
      procedure.countryCode,
      procedure.stage,
      procedure.status,
      procedure.grounds,
      procedure.evidence,
      JSON.stringify(procedure.support),
      procedure.chamberVotes,
      procedure.senateVotes,
      procedure.openedAtTurn,
      procedure.deadlineTurn,
      JSON.stringify(procedure.timeline),
    ],
  );
  return rows[0].id;
}

export async function updateProcedure(client, id, procedure) {
  await client.query(
    `UPDATE political_procedures
        SET stage = $2,
            status = $3,
            evidence = $4,
            support = $5,
            chamber_votes = $6,
            senate_votes = $7,
            deadline_turn = $8,
            resolution = $9,
            resolved_at_turn = $10,
            timeline = $11,
            updated_at = now()
      WHERE id = $1`,
    [
      id,
      procedure.stage,
      procedure.status,
      procedure.evidence,
      JSON.stringify(procedure.support),
      procedure.chamberVotes,
      procedure.senateVotes,
      procedure.deadlineTurn,
      procedure.resolution,
      procedure.resolvedAtTurn,
      JSON.stringify(procedure.timeline),
    ],
  );
}
