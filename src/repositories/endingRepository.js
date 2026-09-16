export async function findAllEndings(client) {
  const { rows } = await client.query(`SELECT code, kind, title, text FROM endings ORDER BY code`);
  return Object.fromEntries(rows.map((row) => [row.code, row]));
}

export async function upsertEndings(client, endings) {
  for (const ending of endings) {
    await client.query(
      `INSERT INTO endings (code, kind, title, text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET
         kind = EXCLUDED.kind,
         title = EXCLUDED.title,
         text = EXCLUDED.text,
         updated_at = now()`,
      [ending.code, ending.kind, ending.title, ending.text],
    );
  }
}
