import { countries } from "@/src/content/countries";
import { resolveCampaign } from "@/src/domain/election";

const brazil = countries.BR;

// Built from the pack itself, so the test never hard-codes a trait key that content may rename.
const candidate = {
  name: "AnaVilalba",
  treatment: brazil.candidateOptions.treatments[0].key,
  origin: brazil.candidateOptions.origins[0].key,
  style: brazil.candidateOptions.styles[0].key,
  party: brazil.candidateOptions.parties[0].key,
  coalition: brazil.candidateOptions.coalitions[0].key,
  promise: brazil.candidateOptions.promises[0].key,
};

const run = (choices) => resolveCampaign({ country: brazil, candidate, choices });

// The questions in the order the pack declares them: economy, coalition, dossier, last week and the
// environment. Every option below is real content, so these are two campaigns a player can run.
//
// Taking everything on offer wins outright at 57.4. Refusing all of it — austerity, no coalition, no
// dossier, the market instead of the streets, and enforcement instead of licensing — lands at 44.8
// and is beaten in the runoff.
const AGGRESSIVE = ["right", "left", "left", "left", "left"];
const CLEAN = ["left", "right", "right", "right", "right"];

describe("a campaign strong enough to win outright", () => {
  it("is decided in the first round and takes office", () => {
    const result = run(AGGRESSIVE);

    expect(result.outcome).toBe("elected");
    expect(result.election.round).toBe(1);
    expect(result.election.share).toBeGreaterThan(brazil.electoralRules.runoffThreshold);
  });

  it("still hands the government its starting pillars and campaign flags", () => {
    const result = run(AGGRESSIVE);

    expect(Object.keys(result.meters).sort()).toEqual([
      "congress",
      "institutions",
      "market",
      "people",
    ]);
    expect(result.flagKeys.length).toBeGreaterThan(0);
  });
});

describe("a campaign that refuses every deal", () => {
  // Refusing the coalition, the dossier and the streets is honourable and it loses votes. Nobody is
  // owed an election for having clean hands.
  it("goes to a runoff and is beaten there", () => {
    const result = run(CLEAN);

    expect(result.outcome).toBe("defeated");
    expect(result.election.round).toBe(2);
    expect(result.election.share).toBeLessThan(50);
    expect(result.election.margin).toBeLessThan(0);
  });

  it("gives the opponent the larger share, and the two add up to the whole", () => {
    const { election } = run(CLEAN);

    expect(election.opponentShare).toBeGreaterThan(election.share);
    expect(Math.round(election.share + election.opponentShare)).toBe(100);
  });

  it("carries a headline written for losing, not a victory one", () => {
    const { election } = run(CLEAN);

    expect(election.headline).toEqual(expect.any(String));
    expect(election.headline).not.toMatch(/Vitória|eleita|elege/i);
  });

  // There is no government to give pillars to: the mandate never starts.
  it("produces no starting state at all", () => {
    const result = run(CLEAN);

    expect(result.meters).toBeNull();
    expect(result.flagKeys).toEqual([]);
  });
});

describe("the result either way", () => {
  it("is the same campaign every time it is run", () => {
    expect(run(CLEAN)).toEqual(run(CLEAN));
    expect(run(AGGRESSIVE)).toEqual(run(AGGRESSIVE));
  });

  it("reports which decisions produced it", () => {
    const { election } = run(CLEAN);

    expect(election.decisions).toHaveLength(brazil.campaign.questions.length);
    expect(election.decisions[0]).toMatchObject({ choice: "left", label: expect.any(String) });
  });
});
