import { loadContent } from "@/src/content";
import { cardDefinitions } from "@/src/content/cards";
import { characters } from "@/src/content/characters";
import { countries } from "@/src/content/countries";
import { endingDefinitions } from "@/src/content/endings";
import { epithetDefinitions } from "@/src/content/epithets";
import { flagCatalog } from "@/src/content/flags";
import { validateContent } from "@/src/content/validate";
import { MANDATE_TURNS } from "@/src/domain/constants";
import { toCampaignView, toCandidateOptionsView, toCountryView } from "@/src/services/gameViews";

function errorsAfter(mutate) {
  const content = structuredClone({
    cards: cardDefinitions,
    flags: flagCatalog,
    characters,
    countries,
    endings: endingDefinitions,
    epithets: epithetDefinitions,
  });
  mutate(content);
  return validateContent(content).errors;
}

describe("country registry", () => {
  it("ships Brazil as the only playable pack", () => {
    const playable = Object.values(countries)
      .filter((country) => country.playable)
      .map((country) => country.countryCode);

    expect(playable).toEqual(["BR"]);
  });

  it("is read through the validated content, keyed by country code", () => {
    const loaded = loadContent().countries;

    expect(Object.keys(loaded).sort()).toEqual(["BR", "US"]);
    for (const [code, country] of Object.entries(loaded)) expect(country.countryCode).toBe(code);
  });

  it("announces the United States without any rule or content", () => {
    const usa = countries.US;

    expect(usa).toMatchObject({ playable: false, name: "Estados Unidos" });
    expect(usa.developmentNote).toEqual(expect.any(String));
    expect(usa.campaign).toBeUndefined();
    expect(usa.candidateOptions).toBeUndefined();
  });

  it("describes the Brazilian institutions the onboarding shows", () => {
    const brazil = countries.BR;

    expect(brazil.office).toMatchObject({
      title: "Presidente da República",
      termMonths: MANDATE_TURNS,
      headquarters: "Palácio do Planalto",
    });
    expect(brazil.powers.lowerHouse).toMatchObject({ name: "Câmara dos Deputados", seats: 513 });
    expect(brazil.powers.upperHouse).toMatchObject({ name: "Senado Federal", seats: 81 });
    expect(brazil.powers.supremeCourt).toMatchObject({
      name: "Supremo Tribunal Federal",
      justices: 11,
    });
    expect(brazil.removal.type).toBe("impeachment");
    expect(brazil.electoralRules.runoffThreshold).toBe(50);
  });

  it("seats only the ministries the cast actually has someone for", () => {
    const { cabinet, keyMinistries } = countries.BR;
    const seated = cabinet.holders.map((holder) => holder.portfolio);
    const declared = keyMinistries.map((ministry) => ministry.key);

    expect(seated).toEqual(["casa_civil", "fazenda", "saude", "educacao"]);
    // Every holder is somebody the registry knows, by id and not by display name.
    for (const holder of cabinet.holders) {
      expect(Object.hasOwn(characters, holder.character)).toBe(true);
    }
    // Justiça and Defesa are declared ministries that start empty. An empty chair is the truth; an
    // invented minister would not be.
    expect(declared).toEqual(expect.arrayContaining([...seated, "justica", "defesa"]));
    expect(declared).toHaveLength(6);
  });

  it("offers a form of address that does not gender the candidate by default", () => {
    expect(countries.BR.candidateOptions.treatments[0]).toMatchObject({ key: "neutro" });
  });

  it("uses only fictional people and parties", () => {
    const brazil = countries.BR;
    const names = [
      brazil.campaign.opponent.name,
      ...brazil.candidateOptions.parties.map((party) => party.name),
    ].join(" | ");

    expect(names).toEqual(expect.any(String));
    expect(names).not.toMatch(/Lula|Bolsonaro|Dilma|Temer|PT\b|PSDB|MDB\b|PL\b/);
  });

  it("sets every campaign flag through the shared catalog", () => {
    const brazil = countries.BR;
    const used = [
      ...Object.values(brazil.candidateOptions).flatMap((group) =>
        group.flatMap((option) => option.flags ?? []),
      ),
      ...brazil.campaign.questions.flatMap((question) =>
        [question.options.left, question.options.right].flatMap((option) => option.flags),
      ),
    ];

    expect(used.length).toBeGreaterThan(0);
    for (const key of used) expect(Object.hasOwn(flagCatalog, key)).toBe(true);
  });
});

describe("country validation", () => {
  it.each([
    [
      "a campaign option that sets an unknown flag",
      (content) => content.countries.BR.campaign.questions[0].options.left.flags.push("ghost_flag"),
      /sets unknown flag "ghost_flag"/,
    ],
    [
      "a mandate the engine cannot run",
      (content) => (content.countries.BR.office.termMonths = 60),
      /termMonths must be 48/,
    ],
    [
      "a country without an oath",
      (content) => delete content.countries.BR.oath,
      /oath must be a non-empty string/,
    ],
    [
      "a campaign option in a region the country does not have",
      (content) =>
        (content.countries.BR.campaign.questions[0].options.left.regions = { Ártico: 2 }),
      /unknown region "Ártico"/,
    ],
    [
      "headlines that leave a zero margin uncovered",
      (content) =>
        (content.countries.BR.campaign.headlines = [
          { minMargin: 10, text: "Vitória", summary: "Resumo" },
        ]),
      /headlines must cover a zero margin/,
    ],
    [
      "a countryCode that disagrees with its key",
      (content) => (content.countries.BR.countryCode = "AR"),
      /countryCode must match its key/,
    ],
    [
      "a pillar without a local name",
      (content) => delete content.countries.BR.terminology.pillars.congress,
      /terminology.pillars is missing "congress"/,
    ],
    [
      "no playable country at all",
      (content) => (content.countries.BR.playable = false),
      /at least one playable country/,
    ],
    [
      "a minister who is not in the character registry",
      (content) => (content.countries.BR.cabinet.holders[0].character = "ghost-minister"),
      /unknown character "ghost-minister"/,
    ],
    [
      "a cabinet seat in a ministry the country does not declare",
      (content) => (content.countries.BR.cabinet.holders[0].portfolio = "turismo"),
      /seats "turismo", which is not one of the country's ministries/,
    ],
    [
      "the same ministry seated twice",
      (content) =>
        content.countries.BR.cabinet.holders.push({
          portfolio: "casa_civil",
          character: "caio-ferraz",
        }),
      /seats "casa_civil" twice/,
    ],
    [
      "a loyalty outside its bounds",
      (content) => (content.countries.BR.cabinet.holders[0].loyalty = 140),
      /needs a loyalty between 0 and 100/,
    ],
    [
      "a cabinet without a default loyalty for the seats that name none",
      (content) => delete content.countries.BR.cabinet.defaultLoyalty,
      /cabinet.defaultLoyalty must be an integer between 0 and 100/,
    ],
  ])("rejects %s", (_, mutate, message) => {
    expect(errorsAfter(mutate)).toContainEqual(expect.stringMatching(message));
  });

  it("accepts the shipped content", () => {
    expect(errorsAfter(() => {})).toEqual([]);
  });
});

// Fields that decide consequences. Searching for keys, not text: "market_round" is the id of a
// campaign option and must be allowed through.
const SECRET_KEYS = [
  "meters",
  "flags",
  "share",
  "turnout",
  "regions",
  "electorate",
  "baseShare",
  "baseTurnout",
  "validVoteRate",
  "headlines",
];

function secretsIn(value, path = "root") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => secretsIn(item, `${path}[${index}]`));
  }
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) =>
    SECRET_KEYS.includes(key) ? [`${path}.${key}`] : secretsIn(item, `${path}.${key}`),
  );
}

describe("country views", () => {
  const brazil = countries.BR;

  it("never exposes what a candidate option or a campaign choice costs", () => {
    const published = {
      options: toCandidateOptionsView(brazil),
      campaign: toCampaignView(brazil),
    };

    expect(secretsIn(published)).toEqual([]);
    // The same search over the raw content finds the fields, so the check above means something.
    expect(secretsIn(brazil.campaign.questions[0].options.left).length).toBeGreaterThan(0);
  });

  it("keeps the labels the onboarding needs", () => {
    const options = toCandidateOptionsView(brazil);
    const campaign = toCampaignView(brazil);

    expect(options.parties[0]).toMatchObject({ acronym: expect.any(String) });
    expect(options.origins[0]).toMatchObject({
      key: expect.any(String),
      label: expect.any(String),
    });
    expect(campaign.questions).toHaveLength(brazil.campaign.questions.length);
    expect(campaign.questions[0].options.left).toMatchObject({
      id: expect.any(String),
      label: expect.any(String),
    });
  });

  it("reduces a country in development to what the selection screen shows", () => {
    const view = toCountryView(countries.US);

    expect(view).toMatchObject({ code: "US", playable: false });
    expect(view.developmentNote).toEqual(expect.any(String));
    expect(view.terminology).toBeUndefined();
    expect(view.regions).toBeUndefined();
  });
});
