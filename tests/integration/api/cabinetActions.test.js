import { POST as postCabinetAction } from "@/app/api/v1/games/[id]/cabinet/actions/route";
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

function act(id, body) {
  return postCabinetAction(
    postRequest(`/api/v1/games/${id}/cabinet/actions`, body),
    routeContext(id),
  );
}

function readCabinet(gameId) {
  return queryTestDatabase(
    `SELECT portfolio, holder_character_id, loyalty, since_turn
       FROM cabinet_seats WHERE game_id = $1 ORDER BY portfolio`,
    [gameId],
  );
}

function readActions(gameId) {
  return queryTestDatabase(
    `SELECT turn, action, ministry_key, previous_character_id, next_character_id, source
       FROM cabinet_actions WHERE game_id = $1 ORDER BY created_at`,
    [gameId],
  );
}

async function suspendThePresidency(gameId) {
  await queryTestDatabase(
    `INSERT INTO political_procedures
       (game_id, type, country_code, stage, status, grounds, evidence, support, opened_at_turn,
        deadline_turn, timeline)
     VALUES ($1, 'impeachment', 'BR', 'suspended', 'active', 'audit_cover_up', 60, $2, 1, 7,
             '[]'::jsonb)`,
    [gameId, JSON.stringify(SUPPORT)],
  );
}

describe("appointing a minister", () => {
  it("fills the empty chair and records the change as one the Presidency signed", async () => {
    const { game } = await createGame();

    const response = await act(game.id, {
      turn: 1,
      action: "appoint",
      ministryKey: "justica",
      candidateId: "justica-bruno",
    });

    expect(response.status).toBe(200);
    const { rows } = await readCabinet(game.id);
    expect(rows.find((row) => row.portfolio === "justica")).toMatchObject({
      holder_character_id: "bruno-tavares",
      loyalty: 45,
      since_turn: 1,
    });

    const actions = await readActions(game.id);
    expect(actions.rows).toEqual([
      expect.objectContaining({
        turn: 1,
        action: "appoint",
        ministry_key: "justica",
        previous_character_id: null,
        next_character_id: "bruno-tavares",
        source: "manual",
      }),
    ]);
  });

  it("moves the pillars by what the country and the new minister are worth", async () => {
    const { game } = await createGame();

    const response = await act(game.id, {
      turn: 1,
      action: "appoint",
      ministryKey: "justica",
      candidateId: "justica-bruno",
    });
    const body = await response.json();

    // appoint (+1 congress, +1 institutions) plus what Bruno Tavares brings: institucionalista
    // (+3 institutions) and independente (+2 institutions, -2 congress). The server decides all of
    // it, and the browser is never told the arithmetic.
    expect(body.game.meters).toMatchObject({
      people: { value: 50 },
      market: { value: 50 },
      congress: { value: 49 },
      institutions: { value: 56 },
    });
  });

  it("refuses a candidate the registry allows only in another ministry", async () => {
    const { game } = await createGame();

    const response = await act(game.id, {
      turn: 1,
      action: "appoint",
      ministryKey: "justica",
      candidateId: "fazenda-caio",
    });

    expect((await response.json()).error.code).toBe("CANDIDATE_NOT_ELIGIBLE");
  });

  it("refuses a candidate the pack never declared", async () => {
    const { game } = await createGame();

    const response = await act(game.id, {
      turn: 1,
      action: "appoint",
      ministryKey: "justica",
      candidateId: "ghost-candidate",
    });

    expect((await response.json()).error.code).toBe("UNKNOWN_CANDIDATE");
  });

  it("refuses a ministry that already has a holder", async () => {
    const { game } = await createGame();

    const response = await act(game.id, {
      turn: 1,
      action: "appoint",
      ministryKey: "fazenda",
      candidateId: "fazenda-caio",
    });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("MINISTRY_ALREADY_HELD");
  });

  it("refuses a ministry the country does not declare", async () => {
    const { game } = await createGame();

    const response = await act(game.id, {
      turn: 1,
      action: "appoint",
      ministryKey: "turismo",
      candidateId: "justica-bruno",
    });

    expect((await response.json()).error.code).toBe("UNKNOWN_MINISTRY");
  });
});

describe("dismissing and replacing", () => {
  it("empties the chair and charges the ministers who stayed", async () => {
    const { game } = await createGame();

    await act(game.id, { turn: 1, action: "dismiss", ministryKey: "saude" });

    const { rows } = await readCabinet(game.id);
    const seat = (portfolio) => rows.find((row) => row.portfolio === portfolio);

    expect(seat("saude")).toMatchObject({ holder_character_id: null, loyalty: null });
    // 74 and 64 less the six the country charges for losing a minister.
    expect(seat("casa_civil").loyalty).toBe(68);
    expect(seat("fazenda").loyalty).toBe(58);
  });

  it("refuses to dismiss a chair that is already empty", async () => {
    const { game } = await createGame();

    const response = await act(game.id, { turn: 1, action: "dismiss", ministryKey: "justica" });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("MINISTRY_ALREADY_VACANT");
  });

  it("swaps one minister for another in a single action", async () => {
    const { game } = await createGame();

    const response = await act(game.id, {
      turn: 1,
      action: "replace",
      ministryKey: "fazenda",
      candidateId: "fazenda-caio",
    });

    expect(response.status).toBe(200);
    const { rows } = await readCabinet(game.id);
    expect(rows.find((row) => row.portfolio === "fazenda")).toMatchObject({
      holder_character_id: "caio-ferraz",
      loyalty: 80,
    });
    expect((await readActions(game.id)).rows[0]).toMatchObject({
      action: "replace",
      previous_character_id: "livia-nogueira",
      next_character_id: "caio-ferraz",
    });
  });
});

describe("the limits the Presidency works under", () => {
  it("allows one change a month and refuses the second", async () => {
    const { game } = await createGame();

    const first = await act(game.id, { turn: 1, action: "dismiss", ministryKey: "saude" });
    const second = await act(game.id, { turn: 1, action: "dismiss", ministryKey: "educacao" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect((await second.json()).error.code).toBe("CABINET_ACTION_ALREADY_USED");
    expect((await readActions(game.id)).rows).toHaveLength(1);
  });

  // The database, not the screen, is what holds the limit when two requests arrive together.
  it("lets exactly one of two simultaneous changes through", async () => {
    const { game } = await createGame();

    const [a, b] = await Promise.all([
      act(game.id, { turn: 1, action: "dismiss", ministryKey: "saude" }),
      act(game.id, { turn: 1, action: "dismiss", ministryKey: "educacao" }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    expect((await readActions(game.id)).rows).toHaveLength(1);
  });

  it("refuses to reorganise the government while the Presidency is suspended", async () => {
    const { game } = await createGame();
    await suspendThePresidency(game.id);

    const response = await act(game.id, { turn: 1, action: "dismiss", ministryKey: "saude" });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("CABINET_LOCKED_WHILE_SUSPENDED");
    expect((await readActions(game.id)).rows).toHaveLength(0);
  });

  it("refuses an action aimed at a month that has already passed", async () => {
    const { game } = await createGame();

    const response = await act(game.id, { turn: 7, action: "dismiss", ministryKey: "saude" });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("TURN_ALREADY_DECIDED");
  });
});

describe("what the endpoint refuses to be told", () => {
  it.each([
    ["effects", { effects: { people: 40 } }],
    ["loyalty", { loyalty: 100 }],
    ["competence", { competence: 99 }],
    ["influence", { influence: 99 }],
    ["occupant", { occupant: "helena-vasque" }],
    ["flags", { flags: ["anything"] }],
    ["country", { country: "BR" }],
  ])("rejects a body carrying %s", async (_, extra) => {
    const { game } = await createGame();

    const response = await act(game.id, {
      turn: 1,
      action: "dismiss",
      ministryKey: "saude",
      ...extra,
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("UNKNOWN_FIELDS");
    expect((await readActions(game.id)).rows).toHaveLength(0);
  });

  it("rejects an operation the engine does not have", async () => {
    const { game } = await createGame();

    const response = await act(game.id, {
      turn: 1,
      action: "promote",
      ministryKey: "saude",
    });

    expect((await response.json()).error.code).toBe("UNKNOWN_CABINET_ACTION");
  });

  it("rejects a dismissal that names a successor", async () => {
    const { game } = await createGame();

    const response = await act(game.id, {
      turn: 1,
      action: "dismiss",
      ministryKey: "saude",
      candidateId: "saude-helio",
    });

    expect(response.status).toBe(400);
  });

  it("rejects an appointment with no candidate at all", async () => {
    const { game } = await createGame();

    const response = await act(game.id, { turn: 1, action: "appoint", ministryKey: "justica" });

    expect(response.status).toBe(400);
  });
});
