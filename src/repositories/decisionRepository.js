export async function insertDecision(client, gameId, decision) {
  await client.query(
    `INSERT INTO decisions (game_id, turn, card_id, card_slug, card_version, speaker, card_text,
                            choice, choice_label, result_text, consequence, deltas,
                            meters_before, meters_after, flag_changes, scheduled_events)
     VALUES ($1, $2, (SELECT id FROM cards WHERE slug = $3), $3, $4, $5, $6, $7, $8, $9,
             $10, $11, $12, $13, $14, $15)`,
    [
      gameId,
      decision.turn,
      decision.cardSlug,
      decision.cardVersion,
      JSON.stringify(decision.speaker),
      decision.cardText,
      decision.choice,
      decision.choiceLabel,
      decision.resultText,
      // SQL NULL, never the JSON value null, when the card had no authored consequence.
      decision.consequence ? JSON.stringify(decision.consequence) : null,
      JSON.stringify(decision.deltas),
      JSON.stringify(decision.metersBefore),
      JSON.stringify(decision.metersAfter),
      JSON.stringify(decision.flagChanges),
      JSON.stringify(decision.scheduledEvents),
    ],
  );
}

export async function findDecisions(client, gameId) {
  const { rows } = await client.query(
    `SELECT turn, card_slug, card_version, speaker, card_text, choice, choice_label, result_text,
            consequence, deltas, meters_before, meters_after, flag_changes, scheduled_events,
            created_at
       FROM decisions
      WHERE game_id = $1
      ORDER BY turn`,
    [gameId],
  );

  return rows.map((row) => ({
    turn: row.turn,
    cardSlug: row.card_slug,
    cardVersion: row.card_version,
    speaker: row.speaker,
    cardText: row.card_text,
    choice: row.choice,
    choiceLabel: row.choice_label,
    resultText: row.result_text,
    consequence: row.consequence,
    deltas: row.deltas,
    metersBefore: row.meters_before,
    metersAfter: row.meters_after,
    flagChanges: row.flag_changes,
    scheduledEvents: row.scheduled_events,
    createdAt: row.created_at,
  }));
}
