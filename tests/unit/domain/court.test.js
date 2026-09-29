import { assessMatters, courtRuling } from "@/src/domain/court";

// A synthetic country: the court's rules have to hold for any pack, so this never reads Brazilian
// content. The bench weighs only what a court answers to — how documented the matter is, and how
// little credit the presidency still has. Hostility in parliament and a coalition falling apart are
// the legislature's business, so this bench declares no weight for them at all.
function buildCountry(overrides = {}) {
  return {
    court: {
      name: "Tribunal da Carta",
      seats: 11,
      majority: 6,
      blocs: [
        {
          key: "institutionalists",
          label: "Institucionalistas",
          share: 0.45,
          intercept: -1.4,
          weights: { evidence: 4.2, credibilityLoss: 2.2 },
        },
        {
          key: "pragmatists",
          label: "Pragmáticos",
          share: 0.36,
          intercept: -3.2,
          weights: { evidence: 3.4, publicPressure: 1.2 },
        },
        {
          key: "aligned",
          label: "Alinhados ao governo",
          share: 0.19,
          intercept: -5.2,
          weights: { evidence: 2.0 },
        },
      ],
      matters: [
        {
          key: "records_withheld",
          label: "Recusa de entregar documentos",
          weight: 38,
          flags: ["documents_withheld"],
          ruledFlag: "court_ruled_records",
          effects: { institutions: 6, congress: -3 },
          setFlags: ["court_ruled_against"],
        },
        {
          key: "data_registry",
          label: "Cadastro nacional de dados",
          weight: 26,
          flags: ["national_data_registry"],
          ruledFlag: "court_ruled_data",
          effects: { institutions: 4, market: -2 },
          setFlags: ["court_ruled_against"],
        },
      ],
    },
    ...overrides,
  };
}

const meters = (over = {}) => ({
  people: 50,
  market: 50,
  congress: 50,
  institutions: 50,
  ...over,
});
const flagged = (...keys) => Object.fromEntries(keys.map((key) => [key, { value: true }]));

describe("what the court has before it", () => {
  it("has nothing to judge while the record is clean", () => {
    const assessment = assessMatters({ country: buildCountry(), flags: {} });

    expect(assessment.matters).toEqual([]);
    expect(assessment.primary).toBeNull();
    expect(assessment.evidence).toBe(0);
  });

  it("takes up a matter the government's own record documents", () => {
    const assessment = assessMatters({
      country: buildCountry(),
      flags: flagged("documents_withheld"),
    });

    expect(assessment.matters).toEqual(["records_withheld"]);
    expect(assessment.primary.label).toBe("Recusa de entregar documentos");
    expect(assessment.evidence).toBe(38);
  });

  it("puts the heaviest matter first when several are documented", () => {
    const assessment = assessMatters({
      country: buildCountry(),
      flags: flagged("documents_withheld", "national_data_registry"),
    });

    expect(assessment.matters).toHaveLength(2);
    expect(assessment.primary.key).toBe("records_withheld");
    // Weight accumulates: a court with two cases before it reads a heavier record than one case.
    expect(assessment.evidence).toBe(64);
  });

  // The evidencing flag never goes away, so without this the bench would re-decide the same case
  // every month until the mandate ended.
  it("does not take up a matter it has already decided", () => {
    const assessment = assessMatters({
      country: buildCountry(),
      flags: flagged("documents_withheld", "court_ruled_records"),
    });

    expect(assessment.matters).toEqual([]);
    expect(assessment.primary).toBeNull();
  });

  it("still takes up the cases it has not decided yet", () => {
    const assessment = assessMatters({
      country: buildCountry(),
      flags: flagged("documents_withheld", "national_data_registry", "court_ruled_records"),
    });

    expect(assessment.matters).toEqual(["data_registry"]);
    expect(assessment.primary.key).toBe("data_registry");
  });

  it("says nothing at all for a country with no court", () => {
    const assessment = assessMatters({ country: {}, flags: flagged("documents_withheld") });

    expect(assessment.matters).toEqual([]);
    expect(assessment.primary).toBeNull();
  });
});

describe("the court ruling", () => {
  it("does not rule when nothing is before it", () => {
    expect(courtRuling({ country: buildCountry(), flags: {}, meters: meters() })).toBeNull();
  });

  it("counts the bench against the majority the country declares", () => {
    const ruling = courtRuling({
      country: buildCountry(),
      flags: flagged("documents_withheld", "national_data_registry"),
      meters: meters({ institutions: 20 }),
    });

    expect(ruling.matter.key).toBe("records_withheld");
    expect(ruling.votes).toBeGreaterThanOrEqual(0);
    expect(ruling.votes).toBeLessThanOrEqual(11);
    expect(ruling.upheld).toBe(ruling.votes >= 6);
  });

  // A thin case does not become a ruling because the streets are angry: the bench answers to the
  // record first, and its aligned wing sits far below its tipping point.
  it("refuses a thin case however badly the government is doing", () => {
    const ruling = courtRuling({
      country: buildCountry(),
      flags: flagged("national_data_registry"),
      meters: meters({ people: 2, institutions: 2, congress: 2 }),
    });

    expect(ruling.upheld).toBe(false);
  });

  it("rules against a government the record buries", () => {
    const ruling = courtRuling({
      country: buildCountry(),
      flags: flagged("documents_withheld", "national_data_registry"),
      meters: meters({ institutions: 8, people: 15 }),
    });

    expect(ruling.upheld).toBe(true);
  });

  it("carries what the ruling costs, straight from the country", () => {
    const ruling = courtRuling({
      country: buildCountry(),
      flags: flagged("documents_withheld"),
      meters: meters({ institutions: 10 }),
    });

    expect(ruling.matter.effects).toEqual({ institutions: 6, congress: -3 });
    expect(ruling.matter.setFlags).toEqual(["court_ruled_against"]);
  });

  it("is the same court every time it is asked", () => {
    const ask = () =>
      courtRuling({
        country: buildCountry(),
        flags: flagged("documents_withheld"),
        meters: meters({ institutions: 30 }),
      });

    expect(ask()).toEqual(ask());
  });

  it("never seats more justices than the bench has", () => {
    const ruling = courtRuling({
      country: buildCountry(),
      flags: flagged("documents_withheld", "national_data_registry"),
      meters: meters({ people: 1, market: 1, congress: 1, institutions: 1 }),
    });

    expect(ruling.votes).toBeLessThanOrEqual(11);
  });
});
