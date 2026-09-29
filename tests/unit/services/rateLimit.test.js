import { RateLimitError } from "@/src/errors";
import { bucketFor, enforceLimit, windowEnd } from "@/src/services/rateLimitService";

const HOUR = 60 * 60 * 1000;
// A round hour, so the arithmetic in the assertions is readable.
const NOON = Date.parse("2026-09-28T12:00:00.000Z");

// Stands in for the pool: answers an insert with a hit count and a sweep with a row count, so the
// service can be driven past its limit without a database.
function fakePool(hits) {
  const calls = [];
  return {
    calls,
    query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("DELETE")) return Promise.resolve({ rowCount: 0 });
      return Promise.resolve({ rows: [{ hits }] });
    },
  };
}

const saved = {};
beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("RATE_LIMIT_")) saved[key] = process.env[key];
  }
  for (const key of Object.keys(saved)) delete process.env[key];
});
afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("RATE_LIMIT_")) delete process.env[key];
  }
  Object.assign(process.env, saved);
});

describe("the window a limit counts in", () => {
  it("keys the count to the action, the caller and the hour", () => {
    expect(bucketFor("games", "203.0.113.7", NOON)).toBe(
      `games:203.0.113.7:${Math.floor(NOON / HOUR)}`,
    );
  });

  it("keeps the same key through the hour and takes a new one after it", () => {
    expect(bucketFor("games", "a", NOON)).toBe(bucketFor("games", "a", NOON + HOUR - 1));
    expect(bucketFor("games", "a", NOON)).not.toBe(bucketFor("games", "a", NOON + HOUR));
  });

  it("does not let one action spend another's allowance", () => {
    expect(bucketFor("games", "a", NOON)).not.toBe(bucketFor("decisions", "a", NOON));
  });

  it("expires at the top of the next hour", () => {
    expect(windowEnd(NOON).toISOString()).toBe("2026-09-28T13:00:00.000Z");
    expect(windowEnd(NOON + 1).toISOString()).toBe("2026-09-28T13:00:00.000Z");
  });
});

describe("enforcing a limit", () => {
  it("lets a caller through while the window still has room", async () => {
    await expect(
      enforceLimit("games", "a", { now: NOON, pool: fakePool(5) }),
    ).resolves.toBeUndefined();
  });

  it("refuses the request that goes past the limit", async () => {
    process.env.RATE_LIMIT_GAMES_PER_HOUR = "5";

    await expect(
      enforceLimit("games", "a", { now: NOON, pool: fakePool(6) }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", statusCode: 429 });
  });

  it("refuses with an error the API already knows how to answer", async () => {
    process.env.RATE_LIMIT_GAMES_PER_HOUR = "1";
    const failure = await enforceLimit("games", "a", { now: NOON, pool: fakePool(2) }).catch(
      (error) => error,
    );

    expect(failure).toBeInstanceOf(RateLimitError);
  });

  it("honours the limit the environment configures", async () => {
    process.env.RATE_LIMIT_GAMES_PER_HOUR = "10";

    await expect(
      enforceLimit("games", "a", { now: NOON, pool: fakePool(9) }),
    ).resolves.toBeUndefined();
  });

  it("counts the attempt before judging it, so a refused call still spends a turn", async () => {
    process.env.RATE_LIMIT_GAMES_PER_HOUR = "1";
    const pool = fakePool(2);

    await enforceLimit("games", "a", { now: NOON, pool }).catch(() => {});

    expect(pool.calls.some((call) => call.sql.includes("INSERT INTO rate_limits"))).toBe(true);
  });

  it("sweeps old windows when a new one opens, and not on every call", async () => {
    const opening = fakePool(1);
    const midWindow = fakePool(2);

    await enforceLimit("games", "a", { now: NOON, pool: opening });
    await enforceLimit("games", "a", { now: NOON, pool: midWindow });

    expect(opening.calls.some((call) => call.sql.includes("DELETE"))).toBe(true);
    expect(midWindow.calls.some((call) => call.sql.includes("DELETE"))).toBe(false);
  });

  it("does nothing at all, and touches no database, when switched off", async () => {
    process.env.RATE_LIMIT_DISABLED = "1";
    const pool = fakePool(9999);

    await enforceLimit("games", "a", { now: NOON, pool });

    expect(pool.calls).toEqual([]);
  });

  // A misspelled action would otherwise be silently unlimited.
  it("treats an unknown action as a programming error", async () => {
    await expect(enforceLimit("ghost", "a", { now: NOON, pool: fakePool(1) })).rejects.toThrow(
      /Unknown rate limited action/,
    );
  });
});
