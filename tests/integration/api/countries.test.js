import { GET as getCountries } from "@/app/api/v1/countries/route";
import { GET as getGameRoute } from "@/app/api/v1/games/[id]/route";
import { POST as postGame } from "@/app/api/v1/games/route";
import { closePool } from "@/src/database/pool";
import { getRequest, postRequest, queryTestDatabase, routeContext } from "../helpers";

const CANDIDATE = {
  name: "Ana Prado",
  treatment: "senhora",
  origin: "sindical",
  style: "conciliador",
  party: "fnt",
  coalition: "ampla",
  promise: "social",
};
// One choice per debate the pack declares. This campaign wins outright, which the tests below rely
// on: they assert a government was created.
const CHOICES = ["right", "left", "right", "left", "right"];

function createGame(body) {
  return postGame(postRequest("/api/v1/games", body));
}

async function elect(overrides = {}) {
  const response = await createGame({
    countryCode: "BR",
    candidate: CANDIDATE,
    campaign: { choices: CHOICES },
    ...overrides,
  });
  return { response, body: await response.json() };
}

afterAll(async () => {
  await closePool();
});

describe("GET /api/v1/countries", () => {
  it("lists Brazil as playable, with the institutions the dossier shows", async () => {
    const response = await getCountries();
    const body = await response.json();
    const brazil = body.countries.find((country) => country.code === "BR");

    expect(response.status).toBe(200);
    expect(brazil).toMatchObject({
      playable: true,
      name: "Brasil",
      longName: "República Federativa do Brasil",
    });
    expect(brazil.office.title).toBe("Presidente da República");
    expect(brazil.powers.supremeCourt.name).toBe("Supremo Tribunal Federal");
    expect(brazil.campaign.questions.length).toBeGreaterThanOrEqual(3);
    expect(brazil.candidateOptions.parties.length).toBeGreaterThan(0);
  });

  it("announces the United States without rules, content or a campaign", async () => {
    const body = await (await getCountries()).json();
    const usa = body.countries.find((country) => country.code === "US");

    expect(usa).toMatchObject({ playable: false, name: "Estados Unidos" });
    expect(usa.developmentNote).toEqual(expect.any(String));
    expect(usa.campaign).toBeUndefined();
    expect(usa.candidateOptions).toBeUndefined();
  });

  it("never reveals what a candidate option or a campaign choice costs", async () => {
    // Keys, not text: "market_round" is the id of a campaign option and is allowed through.
    const secretKeys = [
      "meters",
      "flags",
      "share",
      "turnout",
      "regions",
      "electorate",
      "headlines",
    ];
    const secretsIn = (value, path = "root") => {
      if (Array.isArray(value)) {
        return value.flatMap((item, index) => secretsIn(item, `${path}[${index}]`));
      }
      if (value === null || typeof value !== "object") return [];
      return Object.entries(value).flatMap(([key, item]) =>
        secretKeys.includes(key) ? [`${path}.${key}`] : secretsIn(item, `${path}.${key}`),
      );
    };

    const body = await (await getCountries()).json();
    const brazil = body.countries.find((country) => country.code === "BR");

    expect(secretsIn({ options: brazil.candidateOptions, campaign: brazil.campaign })).toEqual([]);
  });
});

describe("POST /api/v1/games with an electoral prologue", () => {
  it("elects the candidate and opens the government the campaign produced", async () => {
    const { response, body } = await elect();

    expect(response.status).toBe(201);
    expect(body.game.country).toMatchObject({ code: "BR", name: "Brasil" });
    expect(body.game.candidate).toMatchObject({
      name: "Ana Prado",
      party: { acronym: "FNT" },
      promise: { label: "Expansão social" },
    });
    expect(body.game.election).toMatchObject({
      round: expect.any(Number),
      share: expect.any(Number),
      votes: expect.any(Number),
      headline: expect.any(String),
      strongholds: expect.any(Array),
    });
    expect(body.game.election.share).toBeGreaterThan(body.game.election.opponentShare);
    expect(body.currentCard.slug).toEqual(expect.any(String));

    for (const meter of Object.values(body.game.meters)) {
      expect(meter.value).toBeGreaterThanOrEqual(40);
      expect(meter.value).toBeLessThanOrEqual(60);
    }
  });

  it("stores the country, the candidate and the election with the government", async () => {
    const { body } = await elect();
    const { rows } = await queryTestDatabase(
      `SELECT country_code, candidate, election FROM games WHERE id = $1`,
      [body.game.id],
    );

    expect(rows[0].country_code).toBe("BR");
    expect(rows[0].candidate.name).toBe("Ana Prado");
    expect(rows[0].election.share).toBe(body.game.election.share);
  });

  it("turns the campaign into flags the cards can read", async () => {
    const { body } = await elect();
    const { rows } = await queryTestDatabase(
      `SELECT key, label, set_at_turn FROM game_flags WHERE game_id = $1 ORDER BY key`,
      [body.game.id],
    );
    const keys = rows.map((row) => row.key);

    expect(keys).toContain("origin_labour");
    expect(keys).toContain("pledge_social");
    expect(keys).toContain("campaign_spending_pledge");
    for (const row of rows) {
      expect(row.label).toEqual(expect.any(String));
      expect(row.set_at_turn).toBe(1);
    }
  });

  it("resolves the same campaign into the same election every time", async () => {
    const first = await elect();
    const second = await elect();

    expect(first.body.game.id).not.toBe(second.body.game.id);
    expect(second.body.game.election).toEqual(first.body.game.election);
  });

  it("reads the government back with its country, candidate and election", async () => {
    const { body } = await elect();

    const response = await getGameRoute(
      getRequest(`/api/v1/games/${body.game.id}`),
      routeContext(body.game.id),
    );
    const reopened = await response.json();

    expect(response.status).toBe(200);
    expect(reopened.game.country.code).toBe("BR");
    expect(reopened.game.candidate.name).toBe("Ana Prado");
    expect(reopened.game.election).toEqual(body.game.election);
  });
});

describe("POST /api/v1/games without a prologue", () => {
  it.each([
    ["an empty body", {}],
    ["only a country", { countryCode: "BR" }],
  ])("still opens a Brazilian government from %s", async (_, body) => {
    const response = await createGame(body);
    const created = await response.json();

    expect(response.status).toBe(201);
    expect(created.game.country.code).toBe("BR");
    expect(created.game.candidate).toBeNull();
    expect(created.game.election).toBeNull();
    for (const meter of Object.values(created.game.meters)) expect(meter.value).toBe(50);
  });

  it("keeps governments recorded before the country column playable", async () => {
    const created = await (await createGame({})).json();
    // The shape of a government created before the migration: Brazilian by default, no prologue.
    await queryTestDatabase(`UPDATE games SET candidate = NULL, election = NULL WHERE id = $1`, [
      created.game.id,
    ]);

    const response = await getGameRoute(
      getRequest(`/api/v1/games/${created.game.id}`),
      routeContext(created.game.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.game.country).toMatchObject({ code: "BR", name: "Brasil" });
    expect(body.game.candidate).toBeNull();
    expect(body.currentCard.speaker.name).toEqual(expect.any(String));
  });
});

describe("POST /api/v1/games rejects", () => {
  it.each([
    [
      "a country that is still in development",
      { countryCode: "US", candidate: CANDIDATE, campaign: { choices: CHOICES } },
      422,
      "COUNTRY_NOT_PLAYABLE",
    ],
    ["a country that does not exist", { countryCode: "ZZ" }, 422, "UNKNOWN_COUNTRY"],
    ["a malformed country code", { countryCode: "brasil" }, 400, "INVALID_PAYLOAD"],
    ["a candidate without a campaign", { candidate: CANDIDATE }, 400, "INVALID_PAYLOAD"],
    [
      "a campaign side that does not exist",
      // Full length on purpose: a short campaign would be refused for its length before anybody
      // looked at the side.
      { candidate: CANDIDATE, campaign: { choices: ["left", "up", "left", "right", "right"] } },
      422,
      "INVALID_CAMPAIGN_CHOICE",
    ],
    [
      "an incomplete campaign",
      { candidate: CANDIDATE, campaign: { choices: ["left"] } },
      422,
      "INCOMPLETE_CAMPAIGN",
    ],
    [
      "a candidate trait the country does not offer",
      {
        candidate: { ...CANDIDATE, origin: "aristocrata" },
        campaign: { choices: CHOICES },
      },
      422,
      "INVALID_CANDIDATE",
    ],
    [
      "a candidate field the server does not know",
      {
        candidate: { ...CANDIDATE, slogan: "Ordem e progresso" },
        campaign: { choices: CHOICES },
      },
      400,
      "UNKNOWN_FIELDS",
    ],
    [
      "campaign effects sent by the client",
      {
        candidate: CANDIDATE,
        campaign: { choices: CHOICES, meters: { people: 99 } },
      },
      400,
      "UNKNOWN_FIELDS",
    ],
    ["an unknown top-level field", { fraud: true }, 400, "UNKNOWN_FIELDS"],
  ])("%s", async (_, body, status, code) => {
    const response = await createGame(body);

    expect(response.status).toBe(status);
    expect((await response.json()).error.code).toBe(code);
  });
});
