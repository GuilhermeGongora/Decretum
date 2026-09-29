import { Pool } from "pg";
import { DatabaseError } from "@/src/errors";
import { logger } from "@/src/utils/logger";

// Cached on globalThis so Next.js dev hot reloads reuse one pool instead of leaking connections.
const POOL_KEY = Symbol.for("decretum.pg-pool");

// Serverless changes what a pool is for. One long-lived process serving many requests wants several
// connections; a platform that runs a separate function instance per request gets a separate pool
// each time, so a generous size multiplies by the number of live instances and exhausts the database.
// Behind a transaction-mode pooler, one connection per instance is the right size.
//
// Read from the environment, so the size is configuration rather than a guess about the host. The
// default only has to be safe for whoever did not set it.
const DEFAULT_POOL_MAX = process.env.VERCEL ? 1 : 10;

function poolMax() {
  const configured = Number(process.env.DATABASE_POOL_MAX);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_POOL_MAX;
}

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
      max: poolMax(),
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
