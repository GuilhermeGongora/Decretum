// Repositories take a pg client so services control transactions. No path aliases here:
// the seed script imports this file directly with Node.

function toCard(row) {
  return {
    id: row.id,
    slug: row.slug,
    version: row.version,
    role: row.role,
    type: row.type,
    speaker: row.speaker,
    category: row.category,
    text: row.text,
    choices: { left: row.left_choice, right: row.right_choice },
    conditions: row.conditions,
    weight: row.weight,
    cooldownTurns: row.cooldown_turns,
    uniquePerGame: row.unique_per_game,
    active: row.active,
    tags: row.tags,
  };
}

export async function findAllCards(client) {
  const { rows } = await client.query(
    `SELECT id, slug, version, role, type, speaker, category, text, left_choice, right_choice,
            conditions, weight, cooldown_turns, unique_per_game, active, tags
       FROM cards
      ORDER BY slug`,
  );
  return rows.map(toCard);
}

export async function upsertCards(client, cards) {
  for (const card of cards) {
    await client.query(
      `INSERT INTO cards (slug, version, role, type, speaker, category, text, left_choice,
                          right_choice, conditions, weight, cooldown_turns, unique_per_game,
                          active, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (slug) DO UPDATE SET
         version = EXCLUDED.version,
         role = EXCLUDED.role,
         type = EXCLUDED.type,
         speaker = EXCLUDED.speaker,
         category = EXCLUDED.category,
         text = EXCLUDED.text,
         left_choice = EXCLUDED.left_choice,
         right_choice = EXCLUDED.right_choice,
         conditions = EXCLUDED.conditions,
         weight = EXCLUDED.weight,
         cooldown_turns = EXCLUDED.cooldown_turns,
         unique_per_game = EXCLUDED.unique_per_game,
         active = EXCLUDED.active,
         tags = EXCLUDED.tags,
         updated_at = now()`,
      [
        card.slug,
        card.version,
        card.role,
        card.type,
        JSON.stringify(card.speaker),
        card.category,
        card.text,
        JSON.stringify(card.choices.left),
        JSON.stringify(card.choices.right),
        JSON.stringify(card.conditions),
        card.weight,
        card.cooldownTurns,
        card.uniquePerGame,
        card.active,
        card.tags,
      ],
    );
  }

  // Cards removed from content stay in the table (history references them) but stop being drawn.
  await client.query(
    `UPDATE cards SET active = false, updated_at = now()
      WHERE active AND NOT (slug = ANY($1::text[]))`,
    [cards.map((card) => card.slug)],
  );
}
