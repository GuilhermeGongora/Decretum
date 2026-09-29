import { POST as postDecision } from "@/app/api/v1/games/[id]/decisions/route";
import { POST as postGame } from "@/app/api/v1/games/route";
import { closePool } from "@/src/database/pool";
import { postRequest, queryTestDatabase, routeContext } from "../helpers";

async function createGame() {
  const response = await postGame(postRequest("/api/v1/games", {}));
  expect(response.status).toBe(201);
  return response.json();
}

async function decide(id, body) {
  return postDecision(postRequest(`/api/v1/games/${id}/decisions`, body), routeContext(id));
}

// Puts a matter on the record, which is the only way the court ever has anything to judge. Written
// with the same columns the repository writes, so the row is exactly what the engine would have left.
async function documentMatter(gameId, key) {
  await queryTestDatabase(
    `INSERT INTO game_flags (game_id, key, value, label, legacy, legacy_priority,
                             successor_effects, set_at_turn, expires_at_turn, inherited)
     VALUES ($1, $2, $3, $4, false, 0, null, 1, null, false)`,
    [gameId, key, JSON.stringify(true), `Registro: ${key}`],
  );
}

function readFlags(gameId) {
  return queryTestDatabase(`SELECT key FROM game_flags WHERE game_id = $1 ORDER BY key`, [gameId]);
}

afterAll(async () => {
  await closePool();
});

describe("a month with nothing before the court", () => {
  it("answers with no ruling, and with the field all the same", async () => {
    const { game } = await createGame();
    // A drawn card can itself document a matter — several of them set exactly the flags the court
    // judges — and then the bench rules, correctly. For a month with genuinely nothing before it,
    // the card has to be one that sets no flag at all.
    await queryTestDatabase(
      `UPDATE games SET current_card_id = (SELECT id FROM cards WHERE slug = 'emergency_budget')
        WHERE id = $1`,
      [game.id],
    );

    const body = await (await decide(game.id, { choice: "left", turn: 1 })).json();

    expect(body.courtRuling).toBeNull();
    // The field itself must never go missing: that is how a screen loses something after a decision
    // and finds it again only on reload.
    expect(Object.hasOwn(body, "courtRuling")).toBe(true);
  });
});

describe("a government the record catches up with", () => {
  async function judged() {
    const { game } = await createGame();
    await documentMatter(game.id, "documents_withheld");
    await documentMatter(game.id, "press_intimidated");
    // The card of the month is drawn from the game's own seed, and it moves the pillars *and* sets
    // flags of its own before the bench reads the record. Pinning the pillars alone left this test
    // hanging on the draw; the card has to be pinned too. `emergency_budget` touches no flag at all,
    // so nothing it does can reach the court's assessment.
    await queryTestDatabase(
      `UPDATE games
          SET institutions = 5, people = 10,
              current_card_id = (SELECT id FROM cards WHERE slug = 'emergency_budget')
        WHERE id = $1`,
      [game.id],
    );

    const response = await decide(game.id, { choice: "left", turn: 1 });
    const body = await response.json();
    // Asserted together so a refused decision shows its error body instead of a bare status code.
    expect({ status: response.status, body }).toMatchObject({ status: 200 });
    return { game, body };
  }

  it("is judged by the eleven, and told which matter and by how much", async () => {
    const { body } = await judged();

    expect(body.courtRuling).toMatchObject({
      matterKey: "records_withheld",
      courtShortName: "STF",
      seats: 11,
      majority: 6,
      upheld: true,
    });
    // The exact count belongs to the unit tests, where the card of the month is controlled. What has
    // to hold here is that the bench reached its majority and never seated more than eleven.
    expect(body.courtRuling.votes).toBeGreaterThanOrEqual(6);
    expect(body.courtRuling.votes).toBeLessThanOrEqual(11);
  });

  it("carries the ruling in words, for a screen that only has to read it", async () => {
    const { body } = await judged();

    expect(body.courtRuling.summary).toMatch(/O STF decidiu contra o governo/);
  });

  it("leaves the ruling on the record, in the same transaction as the decision", async () => {
    const { game } = await judged();

    const { rows } = await readFlags(game.id);
    const keys = rows.map((row) => row.key);
    expect(keys).toContain("court_ruled_against");
    expect(keys).toContain("court_ruled_records");
  });

  it("does not judge the same matter again the following month", async () => {
    const { game, body } = await judged();

    const next = await (await decide(game.id, { choice: "left", turn: 2 })).json();

    expect(body.courtRuling.matterKey).toBe("records_withheld");
    expect(next.courtRuling?.matterKey ?? null).not.toBe("records_withheld");
  });

  // The engine knows how each wing of the bench voted. The client never does.
  it("never tells the government where the votes were hiding", async () => {
    const { body } = await judged();

    const serialized = JSON.stringify(body.courtRuling);
    for (const secret of ["byBloc", "adherence", "intercept", "weights", "blocs"]) {
      expect(serialized).not.toContain(secret);
    }
  });
});
