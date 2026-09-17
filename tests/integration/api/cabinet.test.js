import { POST as postDecision } from "@/app/api/v1/games/[id]/decisions/route";
import { POST as postGame } from "@/app/api/v1/games/route";
import { closePool } from "@/src/database/pool";
import { postRequest, queryTestDatabase, routeContext } from "../helpers";

const SUPPORT = {
  chamber: 40,
  senate: 40,
  coalitionCohesion: 50,
  publicPressure: 50,
  institutionalCredibility: 50,
};

afterAll(async () => {
  await closePool();
});

async function createGame() {
  const response = await postGame(postRequest("/api/v1/games", {}));
  expect(response.status).toBe(201);
  return response.json();
}

async function decide(id, body) {
  return postDecision(postRequest(`/api/v1/games/${id}/decisions`, body), routeContext(id));
}

function readCabinet(gameId) {
  return queryTestDatabase(
    `SELECT portfolio, holder_character_id, loyalty, since_turn
       FROM cabinet_seats WHERE game_id = $1 ORDER BY portfolio`,
    [gameId],
  );
}

// The month in which the coalition asks for a name. Reaching it by playing is a long road, so the
// government is put in front of the card with the process already at that link.
async function faceTheCampaignCard(gameId, turn = 12) {
  await queryTestDatabase(
    `UPDATE games SET turn = $2,
        current_card_id = (SELECT id FROM cards WHERE slug = 'impeachment_chamber_campaign')
      WHERE id = $1`,
    [gameId, turn],
  );
  await queryTestDatabase(
    `INSERT INTO political_procedures
       (game_id, type, country_code, stage, status, grounds, evidence, support, opened_at_turn,
        timeline)
     VALUES ($1, 'impeachment', 'BR', 'chamber_campaign', 'active', 'audit_cover_up', 60, $2, 10,
             '[]'::jsonb)`,
    [gameId, JSON.stringify(SUPPORT)],
  );
}

describe("the cabinet a government takes office with", () => {
  it("seats every ministry the country declares, vacancies included", async () => {
    const { game } = await createGame();

    const { rows } = await readCabinet(game.id);

    expect(rows).toHaveLength(6);
    const held = rows.filter((row) => row.holder_character_id !== null);
    const vacant = rows.filter((row) => row.holder_character_id === null);

    expect(held.map((row) => row.portfolio)).toEqual([
      "casa_civil",
      "educacao",
      "fazenda",
      "saude",
    ]);
    // The cast has nobody for Justice or Defence, so those chairs start empty rather than invented.
    expect(vacant.map((row) => row.portfolio)).toEqual(["defesa", "justica"]);
    for (const row of vacant) expect(row.loyalty).toBeNull();
  });

  it("gives every seat a holder the character registry knows", async () => {
    const { game } = await createGame();

    const { rows } = await readCabinet(game.id);

    expect(rows.find((row) => row.portfolio === "casa_civil")).toMatchObject({
      holder_character_id: "helena-vasque",
      loyalty: 74,
    });
  });
});

describe("when the coalition demands a name", () => {
  it("hands over the least loyal minister and charges the ones who stayed", async () => {
    const { game } = await createGame();
    await faceTheCampaignCard(game.id);

    const response = await decide(game.id, { choice: "left", turn: 12 });
    expect(response.status).toBe(200);

    const { rows } = await readCabinet(game.id);
    const seat = (portfolio) => rows.find((row) => row.portfolio === portfolio);

    // Saúde is the least loyal of the four the president took office with: 58 against 62, 66 and 74.
    expect(seat("saude")).toMatchObject({ holder_character_id: null, loyalty: null });
    expect(seat("casa_civil")).toMatchObject({ holder_character_id: "helena-vasque", loyalty: 66 });
    expect(seat("fazenda").loyalty).toBe(54);
    expect(seat("educacao").loyalty).toBe(58);
  });

  it("leaves the cabinet alone when the president protects the minister", async () => {
    const { game } = await createGame();
    await faceTheCampaignCard(game.id);

    await decide(game.id, { choice: "right", turn: 12 });

    const { rows } = await readCabinet(game.id);

    expect(rows.filter((row) => row.holder_character_id !== null)).toHaveLength(4);
    expect(rows.find((row) => row.portfolio === "saude").loyalty).toBe(58);
  });

  // The whole reason the cabinet is persisted: the minister does not come back next month.
  it("never puts the minister who was handed over back in office", async () => {
    const { game } = await createGame();
    await faceTheCampaignCard(game.id);

    await decide(game.id, { choice: "left", turn: 12 });
    const second = await decide(game.id, { choice: "left", turn: 13 });
    expect(second.status).toBe(200);

    const { rows } = await readCabinet(game.id);

    expect(rows.find((row) => row.portfolio === "saude")).toMatchObject({
      holder_character_id: null,
      loyalty: null,
    });
    expect(rows.filter((row) => row.holder_character_id !== null)).toHaveLength(3);
  });
});
