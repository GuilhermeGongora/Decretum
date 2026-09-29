import { POST as postDecision } from "@/app/api/v1/games/[id]/decisions/route";
import { POST as postGame } from "@/app/api/v1/games/route";
import { closePool } from "@/src/database/pool";
import { postRequest, queryTestDatabase, routeContext } from "../helpers";

// The suite drives the API harder than any player would, so `.env.test` switches the limiter off.
// This file is the one place that turns it back on, with a limit small enough to reach.
beforeAll(() => {
  delete process.env.RATE_LIMIT_DISABLED;
  process.env.RATE_LIMIT_GAMES_PER_HOUR = "3";
});

afterAll(async () => {
  process.env.RATE_LIMIT_DISABLED = "1";
  delete process.env.RATE_LIMIT_GAMES_PER_HOUR;
  await closePool();
});

// Requests in tests carry no forwarding header, so they all share one bucket: it has to start empty.
beforeEach(async () => {
  await queryTestDatabase(`DELETE FROM rate_limits`);
});

const createGame = () => postGame(postRequest("/api/v1/games", {}));

describe("how often one address may open a government", () => {
  it("answers while the hour has room and refuses once it does not", async () => {
    const statuses = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      statuses.push((await createGame()).status);
    }

    expect(statuses).toEqual([201, 201, 201, 429]);
  });

  it("refuses with a code the interface already knows how to say in words", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) await createGame();

    const body = await (await createGame()).json();

    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("counts the refused attempt too, so nobody retries their way through", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) await createGame();

    const { rows } = await queryTestDatabase(
      `SELECT hits FROM rate_limits WHERE bucket LIKE 'games:%'`,
    );
    expect(rows[0].hits).toBe(5);
  });

  it("writes no government for a request it refused", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) await createGame();
    const { rows: before } = await queryTestDatabase(`SELECT count(*)::int AS n FROM games`);

    await createGame();

    const { rows: after } = await queryTestDatabase(`SELECT count(*)::int AS n FROM games`);
    expect(after[0].n).toBe(before[0].n);
  });

  // Opening governments and governing them are separate allowances: a player who used up the first
  // must still be able to finish the mandate they already started.
  it("does not let a spent allowance stop the game already in progress", async () => {
    const { game } = await (await createGame()).json();
    for (let attempt = 0; attempt < 3; attempt += 1) await createGame();
    expect((await createGame()).status).toBe(429);

    const decision = await postDecision(
      postRequest(`/api/v1/games/${game.id}/decisions`, { choice: "left", turn: 1 }),
      routeContext(game.id),
    );

    expect(decision.status).toBe(200);
  });
});
