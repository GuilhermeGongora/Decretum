import { POST as postGame } from "@/app/api/v1/games/route";
import { closePool } from "@/src/database/pool";
import { postRequest, queryTestDatabase } from "../helpers";

afterAll(async () => {
  await closePool();
});

// Real trait keys from the Brazilian pack; the campaign below is one a player can actually run.
const CANDIDATE = {
  name: "Ana Prado",
  treatment: "senhora",
  origin: "sindical",
  style: "conciliador",
  party: "fnt",
  coalition: "ampla",
  promise: "social",
};

// Austerity, refusing the coalition, refusing the dossier, and closing with the market: honourable,
// and not enough votes.
const LOSING = ["left", "right", "right", "right"];
const WINNING = ["right", "left", "left", "left"];

function run(choices) {
  return postGame(
    postRequest("/api/v1/games", {
      countryCode: "BR",
      candidate: CANDIDATE,
      campaign: { choices },
    }),
  );
}

async function countGames() {
  const { rows } = await queryTestDatabase(`SELECT count(*)::int AS total FROM games`);
  return rows[0].total;
}

describe("a campaign that loses", () => {
  it("answers with the count and no government at all", async () => {
    const response = await run(LOSING);
    const body = await response.json();

    // Nothing was created, so this is not a 201.
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ outcome: "defeated", game: null });
    expect(body.election.margin).toBeLessThan(0);
    expect(body.election.round).toBe(2);
    expect(body.election.headline).toEqual(expect.any(String));
  });

  it("writes no government to the database", async () => {
    const before = await countGames();

    await run(LOSING);

    expect(await countGames()).toBe(before);
  });

  it("never carries a state the player would govern with", async () => {
    const body = await (await run(LOSING)).json();

    expect(body.currentCard).toBeUndefined();
    expect(body.summary).toBeUndefined();
  });
});

describe("a campaign that wins", () => {
  it("still creates the government and says so", async () => {
    const response = await run(WINNING);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.outcome).toBe("elected");
    expect(body.game.id).toEqual(expect.any(String));
    // An elected campaign keeps its count inside the government it created; only a defeat, which
    // has no government to keep it in, carries the election at the top level.
    expect(body.game.election.margin).toBeGreaterThan(0);
  });

  it("takes office with the cabinet its country describes", async () => {
    const body = await (await run(WINNING)).json();

    expect(body.cabinet.seats).toHaveLength(7);
  });
});
