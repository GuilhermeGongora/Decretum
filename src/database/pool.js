import { Pool } from "pg";
import { DatabaseError } from "@/src/errors";
import { logger } from "@/src/utils/logger";

// Cached on globalThis so Next.js dev hot reloads reuse one pool instead of leaking connections.
const POOL_KEY = Symbol.for("decretum.pg-pool");

export function getPool() {
  if (!globalThis[POOL_KEY]) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new DatabaseError("DATABASE_URL is not configured", {
        code: "DATABASE_NOT_CONFIGURED",
      });
    }

    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    // Without a listener, an error on an idle client would crash the process.
    pool.on("error", (error) => logger.error("database.pool.idle_client_error", { error }));

    globalThis[POOL_KEY] = pool;
  }

  return globalThis[POOL_KEY];
}

export async function query(text, params = []) {
  const pool = getPool();
  try {
    return await pool.query(text, params);
  } catch (error) {
    throw new DatabaseError("Database query failed", { cause: error });
  }
}

export async function closePool() {
  const pool = globalThis[POOL_KEY];
  if (!pool) return;
  delete globalThis[POOL_KEY];
  await pool.end();
}
