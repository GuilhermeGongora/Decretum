import { POST as postDecision } from "@/app/api/v1/games/[id]/decisions/route";
import { GET as getChronicle } from "@/app/api/v1/games/[id]/chronicle/route";
import { GET as getGame } from "@/app/api/v1/games/[id]/route";
import { POST as postSuccessor } from "@/app/api/v1/games/[id]/successor/route";
import { POST as postGame } from "@/app/api/v1/games/route";
import { loadContent } from "@/src/content";
import { closePool } from "@/src/database/pool";
import { getRequest, postRequest, queryTestDatabase, routeContext } from "../helpers";

const PILLARS = ["people", "market", "congress", "institutions"];

async function createGame() {
  const response = await postGame(postRequest("/api/v1/games", {}));
  expect(response.status).toBe(201);
  return response.json();
}

async function fetchGame(id) {
  return getGame(getRequest(`/api/v1/games/${id}`), routeContext(id));
}

async function decide(id, body) {
  return postDecision(postRequest(`/api/v1/games/${id}/decisions`, body), routeContext(id));
}

async function endGame(id, endingCode = "people_abandoned") {
  await queryTestDatabase(
    `UPDATE games SET status = 'ended', current_card_id = NULL, ending_code = $2, ended_at = now()
      WHERE id = $1`,
    [id, endingCode],
  );
}

function sideWith(card, predicate) {
  return ["left", "right"].find((side) =>
    PILLARS.some((pillar) => predicate(card.choices[side].effects[pillar].delta)),
  );
}

afterAll(async () => {
  await closePool();
});

describe("POST /api/v1/games", () => {
  it("creates an active government in January of year 1 with every pillar at 50", async () => {
    const body = await createGame();

    expect(body.game).toMatchObject({
      status: "active",
      role: "president",
      turn: 1,
      calendar: { year: 1, monthIndex: 0 },
      mandateCompleted: false,
      endingCode: null,
    });
    for (const pillar of PILLARS) {
      expect(body.game.meters[pillar]).toEqual({ value: 50, band: "governable" });
    }
  });

  it("returns the first card with speaker, dilemma and the trend of both choices", async () => {
    const { currentCard } = await createGame();

    expect(currentCard.speaker).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      title: expect.any(String),
      initials: expect.any(String),
    });
    expect(currentCard.speaker).toHaveProperty("portrait");
    expect(currentCard.text).toEqual(expect.any(String));
    expect(currentCard.choices.left).not.toHaveProperty("headline");
    for (const side of ["left", "right"]) {
      expect(currentCard.choices[side].label).toEqual(expect.any(String));
      expect(Object.keys(currentCard.choices[side].effects).sort()).toEqual([...PILLARS].sort());
    }
  });
});

describe("GET /api/v1/games/:id", () => {
  it("keeps the same undecided card across reloads", async () => {
    const created = await createGame();

    const first = await (await fetchGame(created.game.id)).json();
    const second = await (await fetchGame(created.game.id)).json();

    expect(first.currentCard.slug).toBe(created.currentCard.slug);
    expect(second.currentCard.slug).toBe(created.currentCard.slug);
  });

  it.each([
    ["an unknown id", "7b0f3a2e-0000-4000-8000-000000000000"],
    ["a malformed id", "not-a-uuid"],
  ])("responds 404 for %s", async (_, id) => {
    const response = await fetchGame(id);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "GAME_NOT_FOUND", message: "Government not found" },
    });
  });
});

describe("POST /api/v1/games/:id/decisions", () => {
  it("applies the server-side effects, records the decision and moves to the next month", async () => {
    const { game, currentCard } = await createGame();

    const response = await decide(game.id, { choice: "left", turn: 1 });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.gameOver).toBe(false);
    expect(body.decision).toMatchObject({ turn: 1, cardSlug: currentCard.slug, choice: "left" });
    for (const pillar of PILLARS) {
      expect(body.effects[pillar]).toBe(currentCard.choices.left.effects[pillar].delta);
      expect(body.game.meters[pillar].value).toBe(
        50 + currentCard.choices.left.effects[pillar].delta,
      );
    }
    expect(body.resultText).toEqual(expect.any(String));
    expect(body.game.turn).toBe(2);
    expect(body.nextCard.slug).not.toBe(currentCard.slug);

    const { rows } = await queryTestDatabase(
      `SELECT turn, choice FROM decisions WHERE game_id = $1`,
      [game.id],
    );
    expect(rows).toEqual([{ turn: 1, choice: "left" }]);
  });

  it.each([
    ["invalid JSON", "{not json", 400, "INVALID_JSON"],
    ["a missing choice", {}, 400, "INVALID_PAYLOAD"],
    [
      "client-calculated effects",
      { choice: "left", effects: { people: 50 } },
      400,
      "UNKNOWN_FIELDS",
    ],
    [
      "a client-supplied consequence",
      { choice: "left", consequence: { headline: "Vitória" } },
      400,
      "UNKNOWN_FIELDS",
    ],
    ["a choice that is not left or right", { choice: "up" }, 422, "INVALID_CHOICE"],
  ])("rejects %s", async (_, body, status, code) => {
    const { game } = await createGame();

    const response = await decide(game.id, body);

    expect(response.status).toBe(status);
    expect((await response.json()).error.code).toBe(code);
  });

  it.each(["left", "right"])(
    "returns the authored consequence of the %s choice, never the other side's",
    async (side) => {
      const { game, currentCard } = await createGame();
      const { choices } = loadContent().cards.find((card) => card.slug === currentCard.slug);
      const otherSide = side === "left" ? "right" : "left";

      const body = await (await decide(game.id, { choice: side, turn: 1 })).json();

      expect(body.consequence).toEqual({
        headline: choices[side].headline,
        reaction: choices[side].reaction,
      });
      expect(body.consequence.headline).not.toBe(choices[otherSide].headline);
    },
  );

  it("decides a legacy card stored without an authored consequence and reports none", async () => {
    const { game, currentCard } = await createGame();
    const { rows } = await queryTestDatabase(`SELECT left_choice FROM cards WHERE slug = $1`, [
      currentCard.slug,
    ]);
    await queryTestDatabase(
      `UPDATE cards SET left_choice = left_choice - 'headline' - 'reaction' WHERE slug = $1`,
      [currentCard.slug],
    );

    try {
      const response = await decide(game.id, { choice: "left", turn: 1 });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.consequence).toBeNull();
      expect(body.resultText).toEqual(expect.any(String));
      expect(body.game.turn).toBe(2);
      const stored = await queryTestDatabase(
        `SELECT consequence IS NULL AS missing FROM decisions WHERE game_id = $1`,
        [game.id],
      );
      expect(stored.rows).toEqual([{ missing: true }]);
    } finally {
      await queryTestDatabase(`UPDATE cards SET left_choice = $2 WHERE slug = $1`, [
        currentCard.slug,
        JSON.stringify(rows[0].left_choice),
      ]);
    }
  });

  it("responds 409 when the month was already decided", async () => {
    const { game } = await createGame();
    await decide(game.id, { choice: "left", turn: 1 });

    const response = await decide(game.id, { choice: "right", turn: 1 });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("TURN_ALREADY_DECIDED");
  });

  it("never advances two months for concurrent decisions on the same month", async () => {
    const { game } = await createGame();

    const responses = await Promise.all([
      decide(game.id, { choice: "left", turn: 1 }),
      decide(game.id, { choice: "right", turn: 1 }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const { rows } = await queryTestDatabase(`SELECT turn FROM games WHERE id = $1`, [game.id]);
    expect(rows[0].turn).toBe(2);
  });

  it("responds 409 for a government that has ended", async () => {
    const { game } = await createGame();
    await endGame(game.id);

    const response = await decide(game.id, { choice: "left" });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("GAME_NOT_ACTIVE");
  });

  it("ends the government with its ending and summary when a pillar reaches an extreme", async () => {
    const { game, currentCard } = await createGame();
    const side = sideWith(currentCard, (delta) => delta < 0);
    await queryTestDatabase(
      `UPDATE games SET people = 1, market = 1, congress = 1, institutions = 1 WHERE id = $1`,
      [game.id],
    );

    const response = await decide(game.id, { choice: side, turn: 1 });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.gameOver).toBe(true);
    expect(body.game.status).toBe("ended");
    expect(body.ending).toMatchObject({ kind: "collapse", title: expect.any(String) });
    expect(body.summary).toMatchObject({
      decisionsCount: 1,
      duration: { months: 1, years: 0, remainingMonths: 1 },
      epithet: { code: "brief_government", title: "O Governo Breve" },
    });
    expect(body.summary.score.score).toBeGreaterThan(0);
    expect(body.nextCard).toBeUndefined();

    const reloaded = await (await fetchGame(game.id)).json();
    expect(reloaded).toMatchObject({ currentCard: null, ending: { code: body.ending.code } });
  });

  it("completes the mandate after the decision of month 48", async () => {
    const { game } = await createGame();
    await queryTestDatabase(`UPDATE games SET turn = 48 WHERE id = $1`, [game.id]);

    const response = await decide(game.id, { choice: "left", turn: 48 });
    const body = await response.json();

    expect(body.gameOver).toBe(true);
    expect(body.game).toMatchObject({ status: "completed", mandateCompleted: true });
    expect(body.ending).toMatchObject({ code: "mandate_completed", title: "Quatro Anos Depois" });
    expect(body.summary.score.completionBonus).toBe(2500);
  });
});

describe("GET /api/v1/games/:id/chronicle", () => {
  it("lists every decision in order with its choice, effects and consequence", async () => {
    const { game } = await createGame();
    await decide(game.id, { choice: "left", turn: 1 });
    await decide(game.id, { choice: "right", turn: 2 });

    const response = await getChronicle(
      getRequest(`/api/v1/games/${game.id}/chronicle`),
      routeContext(game.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entries.map((entry) => [entry.turn, entry.choice])).toEqual([
      [1, "left"],
      [2, "right"],
    ]);
    expect(body.entries[0]).toMatchObject({
      calendar: { year: 1, monthIndex: 0 },
      speaker: { name: expect.any(String) },
      choiceLabel: expect.any(String),
      resultText: expect.any(String),
      deltas: expect.any(Object),
    });
  });

  it("reads the consequence stored with the decision, even after the card content changes", async () => {
    const { game, currentCard } = await createGame();
    const decided = await (await decide(game.id, { choice: "right", turn: 1 })).json();
    const { rows } = await queryTestDatabase(`SELECT right_choice FROM cards WHERE slug = $1`, [
      currentCard.slug,
    ]);
    await queryTestDatabase(
      `UPDATE cards SET right_choice = jsonb_set(right_choice, '{headline}', '"Manchete reescrita"')
        WHERE slug = $1`,
      [currentCard.slug],
    );

    try {
      const body = await (
        await getChronicle(getRequest(`/api/v1/games/${game.id}/chronicle`), routeContext(game.id))
      ).json();

      expect(decided.consequence).toEqual({
        headline: expect.any(String),
        reaction: expect.any(String),
      });
      expect(body.entries[0].consequence).toEqual(decided.consequence);
      expect(body.entries[0].consequence.headline).not.toBe("Manchete reescrita");
    } finally {
      await queryTestDatabase(`UPDATE cards SET right_choice = $2 WHERE slug = $1`, [
        currentCard.slug,
        JSON.stringify(rows[0].right_choice),
      ]);
    }
  });

  it("still lists old decisions recorded without a consequence or a known character", async () => {
    const { game } = await createGame();
    await decide(game.id, { choice: "left", turn: 1 });
    await queryTestDatabase(
      `UPDATE decisions
          SET consequence = NULL,
              speaker = '{"key": "helena_arcos", "name": "Helena Arcos", "title": "Chefe da Casa Civil", "portraitKey": "helena_arcos"}'
        WHERE game_id = $1`,
      [game.id],
    );

    const response = await getChronicle(
      getRequest(`/api/v1/games/${game.id}/chronicle`),
      routeContext(game.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entries[0]).toMatchObject({
      consequence: null,
      resultText: expect.any(String),
      speaker: { id: null, name: "Helena Arcos", initials: null, portrait: null },
    });
  });

  it.each([
    ["a headline that is not text", `'{"headline": 1, "reaction": "Reação."}'`],
    ["a missing reaction", `'{"headline": "Manchete"}'`],
    ["an empty headline", `'{"headline": " ", "reaction": "Reação."}'`],
    ["the JSON value null", `'null'`],
  ])("refuses to store %s as a consequence snapshot", async (_, value) => {
    const { game } = await createGame();
    await decide(game.id, { choice: "left", turn: 1 });

    await expect(
      queryTestDatabase(`UPDATE decisions SET consequence = ${value}::jsonb WHERE game_id = $1`, [
        game.id,
      ]),
    ).rejects.toMatchObject({ code: "23514", constraint: "decisions_consequence_shape" });
  });
});

describe("POST /api/v1/games/:id/successor", () => {
  it("responds 409 while the previous government is active", async () => {
    const { game } = await createGame();

    const response = await postSuccessor(
      postRequest(`/api/v1/games/${game.id}/successor`, {}),
      routeContext(game.id),
    );

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("GAME_STILL_ACTIVE");
  });

  it("responds 404 for an unknown government", async () => {
    const id = "7b0f3a2e-0000-4000-8000-000000000001";

    const response = await postSuccessor(
      postRequest(`/api/v1/games/${id}/successor`, {}),
      routeContext(id),
    );

    expect(response.status).toBe(404);
  });

  it("starts a linked government that inherits only legacy flags, once", async () => {
    const { game } = await createGame();
    await queryTestDatabase(
      `INSERT INTO game_flags (game_id, key, value, label, legacy, legacy_priority, successor_effects, set_at_turn)
       VALUES ($1, 'tax_reform_approved', 'true', 'A reforma tributária unificou os impostos.', true, 50,
               '{"people": 1, "market": 4, "congress": -3, "institutions": 2}', 1),
              ($1, 'teachers_raise', 'true', 'Os professores receberam reajuste salarial.', false, 0, NULL, 1)`,
      [game.id],
    );
    await endGame(game.id);

    const response = await postSuccessor(
      postRequest(`/api/v1/games/${game.id}/successor`, {}),
      routeContext(game.id),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.game).toMatchObject({
      status: "active",
      turn: 1,
      previousGameId: game.id,
      startYear: 2,
    });
    expect(body.game.meters).toMatchObject({
      people: { value: 51 },
      market: { value: 54 },
      congress: { value: 47 },
      institutions: { value: 52 },
    });
    expect(body.inheritance.inheritedFlags.map((flag) => flag.key)).toEqual([
      "tax_reform_approved",
    ]);
    expect(body.currentCard).toEqual(expect.objectContaining({ slug: expect.any(String) }));

    const chronicle = await (
      await getChronicle(
        getRequest(`/api/v1/games/${body.game.id}/chronicle`),
        routeContext(body.game.id),
      )
    ).json();
    expect(chronicle.inheritedFlags).toEqual([
      { key: "tax_reform_approved", label: "A reforma tributária unificou os impostos." },
    ]);

    const again = await postSuccessor(
      postRequest(`/api/v1/games/${game.id}/successor`, {}),
      routeContext(game.id),
    );
    expect(again.status).toBe(409);
    expect((await again.json()).error.code).toBe("SUCCESSOR_ALREADY_EXISTS");
  });
});
