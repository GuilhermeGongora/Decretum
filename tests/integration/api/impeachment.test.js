import { GET as getChronicle } from "@/app/api/v1/games/[id]/chronicle/route";
import { POST as postDecision } from "@/app/api/v1/games/[id]/decisions/route";
import { GET as getGame } from "@/app/api/v1/games/[id]/route";
import { POST as postGame } from "@/app/api/v1/games/route";
import { closePool } from "@/src/database/pool";
import { getRequest, postRequest, queryTestDatabase, routeContext } from "../helpers";

const SUPPORT = {
  chamber: 40,
  senate: 40,
  coalitionCohesion: 50,
  publicPressure: 50,
  institutionalCredibility: 50,
};

async function createGame() {
  const response = await postGame(postRequest("/api/v1/games", {}));
  expect(response.status).toBe(201);
  return response.json();
}

async function fetchGame(id) {
  return (await getGame(getRequest(`/api/v1/games/${id}`), routeContext(id))).json();
}

async function decide(id, body) {
  return postDecision(postRequest(`/api/v1/games/${id}/decisions`, body), routeContext(id));
}

// Puts a government in front of a given link of the chain, which is the only way to reach a stage
// without playing the months that lead to it.
async function openProcedureAt(
  gameId,
  { stage, cardSlug, support = {}, evidence = 70, turn = 12 },
) {
  await queryTestDatabase(
    `UPDATE games SET turn = $2, current_card_id = (SELECT id FROM cards WHERE slug = $3)
      WHERE id = $1`,
    [gameId, turn, cardSlug],
  );

  // How heavy the accusation is decides a vote as much as the political drive does, so a scenario
  // that wants a petition thrown out has to say the file is thin, not only that the house is calm.
  const { rows } = await queryTestDatabase(
    `INSERT INTO political_procedures
       (game_id, type, country_code, stage, status, grounds, evidence, support, opened_at_turn, timeline)
     VALUES ($1, 'impeachment', 'BR', $2, 'active', 'audit_cover_up', $4, $3, 10, '[]'::jsonb)
     RETURNING id`,
    [gameId, stage, JSON.stringify({ ...SUPPORT, ...support }), evidence],
  );
  return rows[0].id;
}

function readProcedure(gameId) {
  return queryTestDatabase(
    `SELECT stage, status, resolution, chamber_votes, senate_votes, support
       FROM political_procedures WHERE game_id = $1`,
    [gameId],
  );
}

afterAll(async () => {
  await closePool();
});

describe("a government facing no procedure", () => {
  it("reports none, which is how every government created before the chain reads", async () => {
    const { game } = await createGame();

    const body = await fetchGame(game.id);

    expect(body.procedure).toBeNull();
  });
});

describe("a decision that moves the chain", () => {
  it("persists the new stage in the same transaction as the decision", async () => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_campaign",
      cardSlug: "impeachment_chamber_campaign",
    });

    const response = await decide(game.id, { choice: "left", turn: 12 });

    expect(response.status).toBe(200);
    const { rows } = await readProcedure(game.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ stage: "chamber_vote", status: "active" });
  });

  it("returns where the process stands with the decision that moved it", async () => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_campaign",
      cardSlug: "impeachment_chamber_campaign",
    });

    const body = await (await decide(game.id, { choice: "left", turn: 12 })).json();

    expect(body.procedure).toMatchObject({
      type: "impeachment",
      status: "active",
      stage: { key: "chamber_vote" },
    });
  });
});

describe("the vote in the Chamber", () => {
  it("archives the process when the government keeps the votes it needs", async () => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_vote",
      cardSlug: "impeachment_chamber_vote",
      evidence: 18,
      support: { chamber: 30 },
    });

    await decide(game.id, { choice: "right", turn: 12 });

    const { rows } = await readProcedure(game.id);
    expect(rows[0]).toMatchObject({
      stage: "archived",
      status: "resolved",
      resolution: "archived",
    });
    expect(rows[0].chamber_votes).toBeLessThan(342);
  });

  it("sends the process to the Senate when two thirds of the Chamber authorize it", async () => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_vote",
      cardSlug: "impeachment_chamber_vote",
      support: { chamber: 95 },
    });

    await decide(game.id, { choice: "left", turn: 12 });

    const { rows } = await readProcedure(game.id);
    expect(rows[0]).toMatchObject({ stage: "senate_admissibility", status: "active" });
    expect(rows[0].chamber_votes).toBeGreaterThanOrEqual(342);
  });
});

describe("what the interface is allowed to know", () => {
  it("gives a band before the vote and never the support the engine counts with", async () => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_campaign",
      cardSlug: "impeachment_chamber_campaign",
      support: { chamber: 62 },
    });

    const { procedure } = await fetchGame(game.id);

    expect(procedure.chamber).toMatchObject({ seats: 513, threshold: 342, votes: null });
    expect(procedure.chamber.estimate.low).toBeLessThan(procedure.chamber.estimate.high);

    const serialized = JSON.stringify(procedure);
    for (const secret of ["support", "evidence", "coalitionCohesion", "institutionalCredibility"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("gives the confirmed count once the house has voted, and no estimate", async () => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_vote",
      cardSlug: "impeachment_chamber_vote",
      support: { chamber: 95 },
    });
    await decide(game.id, { choice: "left", turn: 12 });

    const { procedure } = await fetchGame(game.id);

    expect(procedure.chamber.votes).toBeGreaterThanOrEqual(342);
    expect(procedure.chamber.estimate).toBeNull();
  });
});

describe("the client never decides the process", () => {
  it.each([
    ["votes", { choice: "left", turn: 12, votes: 400 }],
    ["a stage", { choice: "left", turn: 12, stage: "senate_trial" }],
    ["evidence", { choice: "left", turn: 12, procedure: { evidence: 100 } }],
  ])("refuses a decision that also sends %s", async (_label, body) => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_campaign",
      cardSlug: "impeachment_chamber_campaign",
    });

    const response = await decide(game.id, body);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("UNKNOWN_FIELDS");
    const { rows } = await readProcedure(game.id);
    expect(rows[0].stage).toBe("chamber_campaign");
  });
});

describe("a government can only face one process at a time", () => {
  it("refuses a second active procedure of the same type", async () => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_campaign",
      cardSlug: "impeachment_chamber_campaign",
    });

    await expect(
      openProcedureAt(game.id, {
        stage: "petition_filed",
        cardSlug: "impeachment_chamber_campaign",
      }),
    ).rejects.toMatchObject({ constraint: "political_procedures_one_active" });
  });
});

async function fetchChronicle(id) {
  return (await getChronicle(getRequest(`/api/v1/games/${id}/chronicle`), routeContext(id))).json();
}

describe("the archive of a constitutional process", () => {
  it("has nothing to show for a government that never faced one", async () => {
    const { game } = await createGame();

    const chronicle = await fetchChronicle(game.id);

    expect(chronicle.procedureEntries).toEqual([]);
    // The rest of the archive is untouched by a government with no process.
    expect(Array.isArray(chronicle.entries)).toBe(true);
  });

  it("records the vote as a milestone, with the month and the house that held it", async () => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_vote",
      cardSlug: "impeachment_chamber_vote",
      support: { chamber: 95 },
    });
    await decide(game.id, { choice: "left", turn: 12 });

    const chronicle = await fetchChronicle(game.id);

    expect(chronicle.procedureEntries.length).toBeGreaterThan(0);
    const [milestone] = chronicle.procedureEntries;
    expect(milestone).toMatchObject({ type: "impeachment", turn: 12 });
    expect(milestone.institution).toBeTruthy();
    expect(milestone.label).toBeTruthy();
    expect(milestone.note).toMatch(/Câmara: \d+ votos/);
  });

  it("reads the same archive twice without duplicating a single entry", async () => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_vote",
      cardSlug: "impeachment_chamber_vote",
      support: { chamber: 95 },
    });
    await decide(game.id, { choice: "left", turn: 12 });

    const first = await fetchChronicle(game.id);
    const second = await fetchChronicle(game.id);

    expect(second.procedureEntries).toEqual(first.procedureEntries);
    expect(second.entries).toEqual(first.entries);
  });

  it("never votes again because the page was opened again", async () => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_vote",
      cardSlug: "impeachment_chamber_vote",
      support: { chamber: 95 },
    });
    await decide(game.id, { choice: "left", turn: 12 });

    const { rows: afterVote } = await readProcedure(game.id);
    // Three reads of the government, as three refreshes would be.
    await fetchGame(game.id);
    await fetchGame(game.id);
    const reread = await fetchGame(game.id);
    const { rows: afterReads } = await readProcedure(game.id);

    expect(afterReads[0].stage).toBe(afterVote[0].stage);
    expect(afterReads[0].chamber_votes).toBe(afterVote[0].chamber_votes);
    expect(reread.procedure.chamber.votes).toBe(afterVote[0].chamber_votes);
  });

  it("keeps a resolved process readable after it has ended", async () => {
    const { game } = await createGame();
    await openProcedureAt(game.id, {
      stage: "chamber_vote",
      cardSlug: "impeachment_chamber_vote",
      evidence: 18,
      support: { chamber: 30 },
    });
    await decide(game.id, { choice: "right", turn: 12 });

    const body = await fetchGame(game.id);

    expect(body.procedure).toMatchObject({
      status: "resolved",
      resolution: "archived",
      nextMilestone: null,
    });
    expect(body.procedure.presidency.key).toBe("in_office");
  });
});

describe("a government removed by the Senate", () => {
  async function convict(gameId) {
    await openProcedureAt(gameId, {
      stage: "senate_trial",
      cardSlug: "impeachment_trial",
      evidence: 92,
      turn: 24,
      support: {
        chamber: 84,
        senate: 82,
        coalitionCohesion: 12,
        publicPressure: 88,
        institutionalCredibility: 15,
      },
    });
    return decide(gameId, { choice: "right", turn: 24 });
  }

  it("ends the mandate with the removal ending, not a generic collapse", async () => {
    const { game } = await createGame();

    const body = await (await convict(game.id)).json();

    expect(body.gameOver).toBe(true);
    expect(body.ending.code).toBe("removed_from_office");
    expect(body.procedureEvent).toMatchObject({
      type: "vote_resolved",
      stage: "senate_trial",
      next: "removed",
    });
  });

  it("keeps the process readable after the government is over", async () => {
    const { game } = await createGame();
    await convict(game.id);

    const body = await fetchGame(game.id);

    // The ended government still answers with its procedure: the panel and the archive open the
    // same way after the last month as before it.
    expect(body.procedure).not.toBeNull();
    expect(body.procedure).toMatchObject({ status: "resolved", resolution: "removed" });
    expect(body.procedure.presidency.key).toBe("removed");
    expect(body.procedure.senate.votes).toBeGreaterThanOrEqual(54);
  });

  it("records the conviction in the archive", async () => {
    const { game } = await createGame();
    await convict(game.id);

    const chronicle = await fetchChronicle(game.id);

    expect(chronicle.procedureEntries.some((entry) => entry.stage === "removed")).toBe(true);
  });
});
