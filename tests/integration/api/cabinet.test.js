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

    expect(rows).toHaveLength(7);
    const held = rows.filter((row) => row.holder_character_id !== null);
    const vacant = rows.filter((row) => row.holder_character_id === null);

    expect(held.map((row) => row.portfolio)).toEqual([
      "casa_civil",
      "defesa",
      "educacao",
      "fazenda",
      "meio_ambiente",
      "saude",
    ]);
    // The cast has nobody for Justice, so that chair starts empty rather than invented.
    expect(vacant.map((row) => row.portfolio)).toEqual(["justica"]);
    for (const row of vacant) expect(row.loyalty).toBeNull();
  });

  it("gives every seat a holder the character registry knows", async () => {
    const { game } = await createGame();

    const { rows } = await readCabinet(game.id);

    expect(rows.find((row) => row.portfolio === "casa_civil")).toMatchObject({
      holder_character_id: "helena-vasque",
      loyalty: 74,
    });
    expect(rows.find((row) => row.portfolio === "fazenda")).toMatchObject({
      holder_character_id: "livia-nogueira",
      loyalty: 64,
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

    // Saúde is the least loyal of the six the president took office with: 58 against 61, 64, 66,
    // 70 and 74.
    expect(seat("saude")).toMatchObject({ holder_character_id: null, loyalty: null });
    expect(seat("casa_civil")).toMatchObject({ holder_character_id: "helena-vasque", loyalty: 66 });
    expect(seat("fazenda")).toMatchObject({ holder_character_id: "livia-nogueira", loyalty: 56 });
    expect(seat("educacao").loyalty).toBe(58);
    expect(seat("defesa").loyalty).toBe(53);
    expect(seat("meio_ambiente").loyalty).toBe(62);
    // The empty chair is untouched by a loyalty shift: there is nobody in it to lose faith.
    expect(seat("justica")).toMatchObject({ holder_character_id: null, loyalty: null });
  });

  it("leaves the cabinet alone when the president protects the minister", async () => {
    const { game } = await createGame();
    await faceTheCampaignCard(game.id);

    await decide(game.id, { choice: "right", turn: 12 });

    const { rows } = await readCabinet(game.id);

    expect(rows.filter((row) => row.holder_character_id !== null)).toHaveLength(6);
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
    expect(rows.filter((row) => row.holder_character_id !== null)).toHaveLength(5);
  });
});

// The two guarantees the reconciliation of a newly declared ministry has to keep, end to end.
describe("a government whose stored cabinet predates the ministries it holds now", () => {
  it("brings a ministry declared later back as an empty chair, and moves nobody else", async () => {
    const { game } = await createGame();
    // Exactly the state a government created before the portfolio existed is left in.
    await queryTestDatabase(
      `DELETE FROM cabinet_seats WHERE game_id = $1 AND portfolio = 'meio_ambiente'`,
      [game.id],
    );
    await faceTheCampaignCard(game.id);

    await decide(game.id, { choice: "right", turn: 12 });

    const { rows } = await readCabinet(game.id);
    const seat = (portfolio) => rows.find((row) => row.portfolio === portfolio);

    expect(rows).toHaveLength(7);
    expect(seat("meio_ambiente")).toMatchObject({ holder_character_id: null, loyalty: null });
    expect(seat("casa_civil")).toMatchObject({ holder_character_id: "helena-vasque", loyalty: 74 });
    expect(seat("saude")).toMatchObject({ holder_character_id: "icaro-nunes", loyalty: 58 });
  });

  it("gives a government that stored no cabinet at all the one its country describes", async () => {
    const { game } = await createGame();
    await queryTestDatabase(`DELETE FROM cabinet_seats WHERE game_id = $1`, [game.id]);
    await faceTheCampaignCard(game.id);

    await decide(game.id, { choice: "right", turn: 12 });

    const { rows } = await readCabinet(game.id);

    // Seven empty chairs would be the wrong reading of "nothing was stored".
    expect(rows).toHaveLength(7);
    expect(rows.filter((row) => row.holder_character_id !== null)).toHaveLength(6);
    expect(rows.find((row) => row.portfolio === "justica").holder_character_id).toBeNull();
  });
});

// The client rebuilds its whole snapshot from whatever a decision answers with. Anything missing
// here is not stale on the screen — it is gone, until the page is reloaded.
describe("what a decided month answers with", () => {
  it("still carries the cabinet, so the room does not vanish between months", async () => {
    const { game } = await createGame();

    const response = await decide(game.id, { choice: "right", turn: 1 });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cabinet.seats).toHaveLength(7);
    expect(body.cabinet.seats.filter((seat) => seat.occupant)).toHaveLength(6);
  });
});
