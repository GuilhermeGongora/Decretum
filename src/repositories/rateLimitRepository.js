// Repositories take a pg client so services control transactions. A rate limit is deliberately kept
// out of the transaction it guards: the attempt has to be counted even when the work itself fails,
// or a client could retry a failing request without limit.

// One statement, so two requests racing on the same bucket cannot both read the same count.
export async function countHit(client, bucket, expiresAt) {
  const { rows } = await client.query(
    `INSERT INTO rate_limits (bucket, hits, expires_at)
     VALUES ($1, 1, $2)
     ON CONFLICT (bucket) DO UPDATE SET hits = rate_limits.hits + 1
     RETURNING hits`,
    [bucket, expiresAt],
  );
  return rows[0].hits;
}

export async function deleteExpired(client, now) {
  const { rowCount } = await client.query(`DELETE FROM rate_limits WHERE expires_at <= $1`, [now]);
  return rowCount;
}
