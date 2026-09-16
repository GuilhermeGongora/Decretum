import { POST as postDecision } from "@/app/api/v1/games/[id]/decisions/route";
import { POST as postGame } from "@/app/api/v1/games/route";
import { closePool } from "@/src/database/pool";
import { updateGame } from "@/src/repositories/gameRepository";
import { postRequest, queryTestDatabase, routeContext } from "../helpers";

// The last write of a decision (the game row) can be made to fail on demand.
jest.mock("@/src/repositories/gameRepository", () => {
  const actual = jest.requireActual("@/src/repositories/gameRepository");
  return { ...actual, updateGame: jest.fn(actual.updateGame) };
});

afterAll(async () => {
  await closePool();
});

async function decide(id, body) {
  return postDecision(postRequest(`/api/v1/games/${id}/decisions`, body), routeContext(id));
}

async function persistedState(id) {
  const count = async (table) =>
    (await queryTestDatabase(`SELECT count(*)::int AS n FROM ${table} WHERE game_id = $1`, [id]))
      .rows[0].n;
  const { rows } = await queryTestDatabase(
    `SELECT turn, people, market, congress, institutions FROM games WHERE id = $1`,
    [id],
  );
  return {
    game: rows[0],
    decisions: await count("decisions"),
    flags: await count("game_flags"),
    events: await count("scheduled_events"),
    appearances: await count("card_appearances"),
  };
}

describe("when a decision fails after part of it was written", () => {
  it("rolls back the choice, effects, consequence, flags and game state together", async () => {
    const response = await postGame(postRequest("/api/v1/games", {}));
    const { game } = await response.json();
    const before = await persistedState(game.id);
    updateGame.mockRejectedValueOnce(new Error("simulated write failure"));

    const failed = await decide(game.id, { choice: "left", turn: 1 });

    expect(failed.status).toBe(500);
    expect(await persistedState(game.id)).toEqual(before);
    expect(before).toMatchObject({ game: { turn: 1 }, decisions: 0, appearances: 1 });
  });

  it("lets the same month be decided again, storing its consequence once", async () => {
    const { game } = await (await postGame(postRequest("/api/v1/games", {}))).json();
    updateGame.mockRejectedValueOnce(new Error("simulated write failure"));
    await decide(game.id, { choice: "right", turn: 1 });

    const retry = await decide(game.id, { choice: "right", turn: 1 });
    const body = await retry.json();

    expect(retry.status).toBe(200);
    const { rows } = await queryTestDatabase(
      `SELECT turn, choice, consequence FROM decisions WHERE game_id = $1`,
      [game.id],
    );
    expect(rows).toEqual([{ turn: 1, choice: "right", consequence: body.consequence }]);
  });
});
