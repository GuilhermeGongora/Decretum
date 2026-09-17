import { brazil } from "@/src/content/countries/brazil";
import {
  countChamberVotes,
  countSenateVotes,
  resolveChamberVote,
  resolveSenateAdmissibility,
  resolveSenateTrial,
} from "@/src/domain/procedure";

// The balancing matrix: the political situations the chain has to be able to produce. Each scenario
// is a state of the world, not a vote typed in by hand, and every number below is computed by the
// engine from the Brazilian pack. Nothing here is random, so a scenario that passes today fails
// loudly the day the model drifts.
const CHAMBER = brazil.removal.chamber;
const SENATE = brazil.removal.senate;

function situation({
  evidence,
  chamber = 50,
  senate = 50,
  coalitionCohesion = 50,
  publicPressure = 50,
  institutionalCredibility = 50,
}) {
  return {
    type: "impeachment",
    countryCode: "BR",
    stage: "chamber_vote",
    status: "active",
    grounds: "audit_cover_up",
    evidence,
    support: { chamber, senate, coalitionCohesion, publicPressure, institutionalCredibility },
    chamberVotes: null,
    senateVotes: null,
    openedAtTurn: 10,
    deadlineTurn: null,
    resolution: null,
    resolvedAtTurn: null,
    timeline: [],
  };
}

// The ten situations of the matrix, named by what they are politically.
const POPULAR_GOVERNMENT = situation({
  evidence: 20,
  chamber: 20,
  senate: 18,
  coalitionCohesion: 85,
  publicPressure: 20,
  institutionalCredibility: 80,
});
const LOYAL_COALITION = situation({
  evidence: 50,
  chamber: 45,
  senate: 40,
  coalitionCohesion: 75,
  publicPressure: 55,
  institutionalCredibility: 55,
});
const FRACTURED_COALITION = situation({
  evidence: 85,
  chamber: 78,
  senate: 72,
  coalitionCohesion: 20,
  publicPressure: 80,
  institutionalCredibility: 25,
});
const HOSTILE_WITHOUT_GROUNDS = situation({
  evidence: 25,
  chamber: 70,
  senate: 60,
  coalitionCohesion: 45,
  publicPressure: 40,
  institutionalCredibility: 60,
});
const TRIAL_WITHOUT_CONVICTION = situation({
  evidence: 55,
  chamber: 60,
  senate: 55,
  coalitionCohesion: 55,
  publicPressure: 60,
});
const NARROW_CONVICTION = situation({
  evidence: 72,
  chamber: 70,
  senate: 66,
  coalitionCohesion: 32,
  publicPressure: 70,
  institutionalCredibility: 35,
});
const INSTITUTIONAL_COLLAPSE = situation({
  evidence: 100,
  chamber: 100,
  senate: 100,
  coalitionCohesion: 0,
  publicPressure: 100,
  institutionalCredibility: 0,
});

describe("what the Chamber does with a petition", () => {
  it("throws it out when the government is popular and the file is thin", () => {
    const vote = resolveChamberVote(POPULAR_GOVERNMENT, brazil);

    expect(vote.authorised).toBe(false);
    expect(vote.votes).toBeLessThan(CHAMBER.authorizationVotes);
  });

  it("falls short while the coalition still holds, even with a real accusation", () => {
    const vote = resolveChamberVote(LOYAL_COALITION, brazil);

    expect(vote.authorised).toBe(false);
    // Close enough that the government can see the cliff: this is a defeat, not a comfortable win.
    expect(vote.votes).toBeGreaterThan(CHAMBER.authorizationVotes * 0.85);
  });

  it("refuses to authorise on hostility alone, with nothing to accuse the president of", () => {
    const vote = resolveChamberVote(HOSTILE_WITHOUT_GROUNDS, brazil);

    expect(vote.authorised).toBe(false);
  });

  it("authorises when the record is heavy and the coalition has broken", () => {
    const vote = resolveChamberVote(FRACTURED_COALITION, brazil);

    expect(vote.authorised).toBe(true);
    expect(vote.votes).toBeGreaterThanOrEqual(CHAMBER.authorizationVotes);
  });

  it("separates a narrow authorisation from a comfortable one", () => {
    const narrow = resolveChamberVote(TRIAL_WITHOUT_CONVICTION, brazil).votes;
    const comfortable = resolveChamberVote(FRACTURED_COALITION, brazil).votes;

    expect(comfortable).toBeGreaterThan(narrow);
  });
});

describe("what the Senate does with an authorised process", () => {
  it("does not open a trial it has no grounds for", () => {
    const vote = resolveSenateAdmissibility(HOSTILE_WITHOUT_GROUNDS, brazil);

    expect(vote.opened).toBe(false);
  });

  it("opens the trial without being able to convict", () => {
    const opened = resolveSenateAdmissibility(TRIAL_WITHOUT_CONVICTION, brazil);
    const trial = resolveSenateTrial(TRIAL_WITHOUT_CONVICTION, brazil);

    expect(opened.opened).toBe(true);
    expect(trial.convicted).toBe(false);
    expect(trial.next).toBe("acquitted");
  });

  it("convicts by a narrow margin when the evidence carries the centre", () => {
    const trial = resolveSenateTrial(NARROW_CONVICTION, brazil);

    expect(trial.convicted).toBe(true);
    expect(trial.votes).toBeGreaterThanOrEqual(SENATE.convictionVotes);
    // Narrow: a conviction, not a landslide.
    expect(trial.votes).toBeLessThan(SENATE.seats * 0.85);
  });

  it("convicts when the government has lost everything at once", () => {
    expect(resolveSenateTrial(FRACTURED_COALITION, brazil).convicted).toBe(true);
    expect(resolveSenateTrial(INSTITUTIONAL_COLLAPSE, brazil).convicted).toBe(true);
  });
});

describe("the shape of the model", () => {
  it("never produces a near-unanimous parliament, even in total collapse", () => {
    const chamber = countChamberVotes(INSTITUTIONAL_COLLAPSE, brazil) / CHAMBER.seats;
    const senate = countSenateVotes(INSTITUTIONAL_COLLAPSE, brazil) / SENATE.seats;

    expect(chamber).toBeLessThan(0.95);
    expect(senate).toBeLessThan(0.95);
  });

  it("makes the accusation matter more than the hostility of the house", () => {
    const hostile = situation({ evidence: 20, chamber: 100, senate: 100 });
    const evidenced = situation({ evidence: 100, chamber: 20, senate: 20 });

    expect(countChamberVotes(evidenced, brazil)).toBeGreaterThan(
      countChamberVotes(hostile, brazil),
    );
    expect(countSenateVotes(evidenced, brazil)).toBeGreaterThan(countSenateVotes(hostile, brazil));
  });

  it("cannot reach two thirds of either house on a thin file and ordinary politics", () => {
    for (const drive of [40, 60, 80]) {
      const thin = situation({
        evidence: 20,
        chamber: drive,
        senate: drive,
        coalitionCohesion: 100 - drive * 0.8,
        publicPressure: drive,
      });

      expect(countChamberVotes(thin, brazil)).toBeLessThan(CHAMBER.authorizationVotes);
      expect(countSenateVotes(thin, brazil)).toBeLessThan(SENATE.convictionVotes);
    }
  });

  it("still lets a total collapse carry a thin file through the Chamber, and no further", () => {
    // Everything at once — the streets at their loudest, the coalition gone, the house hostile —
    // can authorise an accusation that is weak on paper. That is a real political phenomenon and the
    // model does not pretend otherwise. What it refuses is the conviction: two thirds of the Senate
    // will not remove a president on a file this thin, whatever the temperature outside.
    const thinButTotal = situation({
      evidence: 20,
      chamber: 100,
      senate: 100,
      coalitionCohesion: 20,
      publicPressure: 100,
    });

    expect(countChamberVotes(thinButTotal, brazil)).toBeGreaterThanOrEqual(
      CHAMBER.authorizationVotes,
    );
    expect(countSenateVotes(thinButTotal, brazil)).toBeLessThan(SENATE.convictionVotes);
  });

  it("gives the same parliament the same answer every time it is asked", () => {
    for (const scenario of [POPULAR_GOVERNMENT, LOYAL_COALITION, NARROW_CONVICTION]) {
      expect(resolveChamberVote(scenario, brazil)).toEqual(resolveChamberVote(scenario, brazil));
      expect(resolveSenateTrial(scenario, brazil)).toEqual(resolveSenateTrial(scenario, brazil));
    }
  });

  it("orders the scenarios the way the politics does", () => {
    const votes = [
      POPULAR_GOVERNMENT,
      HOSTILE_WITHOUT_GROUNDS,
      LOYAL_COALITION,
      TRIAL_WITHOUT_CONVICTION,
      NARROW_CONVICTION,
      FRACTURED_COALITION,
      INSTITUTIONAL_COLLAPSE,
    ].map((scenario) => countChamberVotes(scenario, brazil));

    for (let i = 1; i < votes.length; i += 1) {
      expect(votes[i]).toBeGreaterThan(votes[i - 1]);
    }
  });
});
