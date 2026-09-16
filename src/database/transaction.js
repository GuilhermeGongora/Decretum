import { getPool } from "@/src/database/pool";
import { DatabaseError } from "@/src/errors";

export async function withTransaction(work) {
  let client;
  try {
    client = await getPool().connect();
  } catch (error) {
    throw new DatabaseError("Could not acquire a database connection", { cause: error });
  }

  let releaseError;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // A client that cannot roll back must not return to the pool.
      releaseError = rollbackError;
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}
