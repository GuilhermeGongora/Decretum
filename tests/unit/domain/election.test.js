import { brazil } from "@/src/content/countries/brazil";
import { METERS, SUCCESSOR_METER_BOUNDS } from "@/src/domain/constants";
import { resolveCampaign, resolveCandidateTraits } from "@/src/domain/election";

const CANDIDATE = {
  name: "Ana Prado",
  treatment: "senhora",
  origin: "sindical",
  style: "conciliador",
  party: "fnt",
  coalition: "ampla",
  promise: "social",
};

const SIDES = ["left", "right"];
// Every campaign the pack allows, whatever number of questions it declares. Adding a debate must not
// mean rewriting this by hand — and it is how a new question gets exercised in both directions.
const everyCampaign = () =>
  brazil.campaign.questions.reduce(
    (campaigns) => campaigns.flatMap((choices) => SIDES.map((side) => [...choices, side])),
    [[]],
  );

const run = (choices, candidate = CANDIDATE) =>
  resolveCampaign({ country: brazil, candidate, choices });

describe("resolveCampaign", () => {
  it("produces the same election for the same campaign, with no randomness", () => {
    const first = run(["left", "right", "left", "right"]);
    const second = run(["left", "right", "left", "right"]);

    expect(first).toEqual(second);
  });

  it("gives different campaigns different results", () => {
    const austere = run(["left", "left", "left", "left"]);
    const popular = run(["right", "right", "right", "right"]);

    expect(austere.election.share).not.toBe(popular.election.share);
    expect(austere.meters).not.toEqual(popular.meters);
  });

  // The campaign used to elect the player whatever they did. It no longer does: some of the sixteen
  // campaigns win and some lose, which is the whole point of running one.
  it("elects some campaigns and defeats others, in one round or two", () => {
    const rounds = new Set();
    const outcomes = new Set();

    for (const choices of everyCampaign()) {
      const { outcome, election } = run(choices);
      rounds.add(election.round);
      outcomes.add(outcome);
      expect(election.share + election.opponentShare).toBeCloseTo(100, 5);
      // Winning is having more votes than the other side and nothing else: a dead tie is not a win.
      expect(outcome === "elected").toBe(election.margin > 0);
    }

    expect([...rounds].sort()).toEqual([1, 2]);
    expect([...outcomes].sort()).toEqual(["defeated", "elected"]);
  });

  it("keeps every pillar of an elected government inside the 40–60 opening range", () => {
    for (const choices of everyCampaign()) {
      const { outcome, meters } = run(choices);
      if (outcome === "defeated") {
        // A campaign that lost starts no government, so it hands over no pillars at all.
        expect(meters).toBeNull();
        continue;
      }
      for (const meter of METERS) {
        expect(meters[meter]).toBeGreaterThanOrEqual(SUCCESSOR_METER_BOUNDS.min);
        expect(meters[meter]).toBeLessThanOrEqual(SUCCESSOR_METER_BOUNDS.max);
      }
    }
  });

  it("reports plausible votes drawn from the electorate", () => {
    const { election } = run(["right", "left", "right", "left"]);

    expect(election.validVotes).toBeLessThan(brazil.campaign.electorate);
    expect(election.votes + election.opponentVotes).toBe(election.validVotes);
    expect(election.turnout).toBeGreaterThan(62);
    expect(election.turnout).toBeLessThan(94);
  });

  it("carries the campaign into the government as flags and a decision log", () => {
    const { flagKeys, election } = run(["left", "left", "right", "right"]);

    expect(flagKeys).toContain("origin_labour");
    expect(flagKeys).toContain("pledge_social");
    expect(flagKeys).toContain("campaign_austerity_pledge");
    expect(flagKeys).toContain("campaign_clean_hands");
    expect(flagKeys).not.toContain("campaign_spending_pledge");
    expect([...flagKeys]).toEqual([...flagKeys].sort());
    expect(election.decisions.map((decision) => decision.choice)).toEqual([
      "left",
      "left",
      "right",
      "right",
    ]);
  });

  it("names the strongholds among the country's own regions", () => {
    const { election } = run(["right", "left", "left", "left"]);

    expect(election.strongholds.length).toBeGreaterThan(0);
    for (const region of election.strongholds) expect(brazil.regions).toContain(region);
  });

  it("picks the authored headline for the margin", () => {
    const narrow = run(["left", "right", "right", "right"]).election;
    const wide = run(["right", "left", "left", "left"]).election;

    expect(narrow.headline).toEqual(expect.any(String));
    expect(wide.margin).toBeGreaterThan(narrow.margin);
    expect(wide.headline).not.toBe(narrow.headline);
  });

  it.each([
    ["too few decisions", ["left", "right"], /INCOMPLETE_CAMPAIGN/],
    ["a side that does not exist", ["left", "up", "left", "right"], /INVALID_CAMPAIGN_CHOICE/],
  ])("rejects %s", (_, choices, code) => {
    expect(() => run(choices)).toThrow(
      expect.objectContaining({ code: expect.stringMatching(code) }),
    );
  });

  it.each(["origin", "style", "party", "coalition", "promise", "treatment"])(
    "rejects a candidate with an unknown %s",
    (field) => {
      const candidate = { ...CANDIDATE, [field]: "inexistente" };

      expect(() => run(["left", "left", "left", "left"], candidate)).toThrow(
        expect.objectContaining({ code: "INVALID_CANDIDATE" }),
      );
    },
  );
});

describe("resolveCandidateTraits", () => {
  it("resolves the traits in the order the snapshot is built", () => {
    const traits = resolveCandidateTraits(brazil, CANDIDATE);

    expect(traits.map((trait) => trait.key)).toEqual([
      "senhora",
      "sindical",
      "conciliador",
      "fnt",
      "ampla",
      "social",
    ]);
  });
});
