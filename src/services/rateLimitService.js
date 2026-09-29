import { getPool } from "@/src/database/pool";
import { RateLimitError } from "@/src/errors";
import { countHit, deleteExpired } from "@/src/repositories/rateLimitRepository";

const WINDOW_MS = 60 * 60 * 1000;

// What one address may do in an hour. Deliberately generous: a whole mandate is 48 decisions, so
// these bound a loop or a crawler without ever being reached by somebody playing.
const ACTIONS = Object.freeze({
  games: { variable: "RATE_LIMIT_GAMES_PER_HOUR", fallback: 20 },
  decisions: { variable: "RATE_LIMIT_DECISIONS_PER_HOUR", fallback: 400 },
  cabinet: { variable: "RATE_LIMIT_CABINET_PER_HOUR", fallback: 200 },
});

function limitFor(action) {
  const configured = Number(process.env[ACTIONS[action].variable]);
  return Number.isInteger(configured) && configured > 0 ? configured : ACTIONS[action].fallback;
}

// The window is part of the key, so a new hour is simply a new row: nothing has to be reset, and no
// clock has to be trusted beyond the one reading that built the key.
export function bucketFor(action, client, now) {
  return `${action}:${client}:${Math.floor(now / WINDOW_MS)}`;
}

export function windowEnd(now) {
  return new Date((Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS);
}

/**
 * Counts this attempt and refuses it if the window is already spent.
 *
 * The attempt is counted before it is judged, and outside the transaction it guards: a request that
 * fails still used a turn, or a client could retry a failing call without limit.
 */
export async function enforceLimit(action, client, { now = Date.now(), pool = getPool() } = {}) {
  if (!Object.hasOwn(ACTIONS, action)) {
    throw new Error(`Unknown rate limited action: ${action}`);
  }
  if (process.env.RATE_LIMIT_DISABLED === "1") return;

  const hits = await countHit(pool, bucketFor(action, client, now), windowEnd(now));

  // Opening a window is the one moment per client per hour when a sweep costs nothing extra, and it
  // needs no randomness to decide on.
  if (hits === 1) await deleteExpired(pool, new Date(now));

  if (hits > limitFor(action)) {
    throw new RateLimitError("Too many requests from this address; try again later");
  }
}
