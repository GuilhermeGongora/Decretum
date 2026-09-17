import { brazil } from "@/src/content/countries/brazil";
import { MANDATE_TURNS } from "@/src/domain/constants";
import {
  applyProcedureEffects,
  canTransition,
  countChamberVotes,
  countSenateVotes,
  estimateRange,
  evaluateGrounds,
  isExpired,
  isResolution,
  nextStage,
  openProcedure,
  resolve,
  resolveChamberVote,
  resolveSenateAdmissibility,
  resolveSenateTrial,
  suspensionDeadline,
  transition,
} from "@/src/domain/procedure";

const flagsFrom = (keys) => Object.fromEntries(keys.map((key) => [key, { value: true }]));

const HOSTILE = { people: 28, market: 40, congress: 22, institutions: 30 };
const CALM = { people: 62, market: 58, congress: 70, institutions: 66 };

// Support is a percentage of the house, so a seat count sits between two percentages. These are the
// supports that land exactly on the constitutional thresholds of 513 and 81 seats.
// `evidence` belongs to the procedure, not to the support of a house: it is what the accusation is
// worth, the same in both chambers. Taking it out of the support object here is what keeps a caller
// from silently filing it under a house and leaving the default in place.
const withSupport = ({ evidence = 60, ...support }, stage = "chamber_vote") => ({
  type: "impeachment",
  countryCode: "BR",
  stage,
  status: "active",
  grounds: "audit_cover_up",
  evidence,
  support: {
    chamber: 0,
    senate: 0,
    coalitionCohesion: 50,
    publicPressure: 50,
    institutionalCredibility: 50,
    ...support,
  },
  chamberVotes: null,
  senateVotes: null,
  openedAtTurn: 10,
  deadlineTurn: null,
  resolution: null,
  resolvedAtTurn: null,
  timeline: [],
});

describe("grounds for a procedure", () => {
  it("does not open a process because a single flag exists", () => {
    const assessment = evaluateGrounds({
      country: brazil,
      flags: flagsFrom(["audit_ignored"]),
      meters: HOSTILE,
      turn: 12,
    });

    expect(assessment.grounds).toEqual(["audit_cover_up"]);
    expect(assessment.opens).toBe(false);
  });

  it("does not open a process on a hostile Congress alone, with nothing to accuse", () => {
    const assessment = evaluateGrounds({ country: brazil, flags: {}, meters: HOSTILE, turn: 20 });

    expect(assessment.grounds).toEqual([]);
    expect(assessment.evidence).toBe(0);
    expect(assessment.opens).toBe(false);
  });

  it("opens when several grounds are documented and Congress is willing to use them", () => {
    const assessment = evaluateGrounds({
      country: brazil,
      flags: flagsFrom(["audit_ignored", "campaign_dossier_used", "questioned_contractor"]),
      meters: HOSTILE,
      turn: 12,
    });

    expect(assessment.grounds.length).toBeGreaterThanOrEqual(2);
    expect(assessment.evidence).toBeGreaterThanOrEqual(45);
    expect(assessment.opens).toBe(true);
  });

  it("keeps the same evidence from a comfortable government, but nobody to carry it", () => {
    const flags = flagsFrom(["audit_ignored", "campaign_dossier_used", "questioned_contractor"]);
    const hostile = evaluateGrounds({ country: brazil, flags, meters: HOSTILE, turn: 12 });
    const calm = evaluateGrounds({ country: brazil, flags, meters: CALM, turn: 12 });

    expect(calm.evidence).toBe(hostile.evidence);
    expect(calm.opens).toBe(false);
  });

  it("is deterministic", () => {
    const run = () =>
      evaluateGrounds({
        country: brazil,
        flags: flagsFrom(["audit_ignored", "press_intimidated", "emergency_procurement"]),
        meters: HOSTILE,
        turn: 15,
      });

    expect(run()).toEqual(run());
  });

  it("refuses to open a procedure without grounds", () => {
    const assessment = evaluateGrounds({ country: brazil, flags: {}, meters: HOSTILE, turn: 9 });

    expect(() => openProcedure({ country: brazil, assessment, turn: 9 })).toThrow(
      expect.objectContaining({ code: "INSUFFICIENT_GROUNDS" }),
    );
  });

  it("starts the chain at the first stage, with the numbers it measured", () => {
    const assessment = evaluateGrounds({
      country: brazil,
      flags: flagsFrom(["audit_ignored", "campaign_dossier_used", "questioned_contractor"]),
      meters: HOSTILE,
      turn: 12,
    });
    const procedure = openProcedure({ country: brazil, assessment, turn: 12 });

    expect(procedure).toMatchObject({
      type: "impeachment",
      countryCode: "BR",
      stage: "grounds_emerging",
      status: "active",
      openedAtTurn: 12,
      resolution: null,
    });
    for (const value of Object.values(procedure.support)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});

describe("the chain", () => {
  it("moves one stage at a time, through the suspension", () => {
    expect(nextStage("grounds_emerging")).toBe("petition_filed");
    expect(nextStage("petition_filed")).toBe("speaker_review");
    expect(nextStage("speaker_review")).toBe("chamber_campaign");
    expect(nextStage("chamber_campaign")).toBe("chamber_vote");
    expect(nextStage("chamber_vote")).toBe("senate_admissibility");
    expect(nextStage("senate_admissibility")).toBe("suspended");
    expect(nextStage("suspended")).toBe("senate_trial");
    expect(nextStage("senate_trial")).toBeNull();
  });

  it.each([
    ["speaker_review", "archived"],
    ["chamber_vote", "senate_admissibility"],
    ["senate_admissibility", "suspended"],
    ["senate_trial", "removed"],
    ["senate_trial", "acquitted"],
  ])("allows %s to reach %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["grounds_emerging", "chamber_vote"],
    ["petition_filed", "removed"],
    ["chamber_campaign", "senate_trial"],
    ["suspended", "archived"],
    ["senate_trial", "chamber_vote"],
  ])("refuses to move from %s to %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => transition(withSupport({}, from), to)).toThrow(
      expect.objectContaining({ code: "INVALID_PROCEDURE_TRANSITION" }),
    );
  });

  it("cannot be moved after it was resolved", () => {
    const archived = resolve(withSupport({}, "speaker_review"), "archived", 14);

    expect(() => transition(archived, "chamber_campaign")).toThrow(
      expect.objectContaining({ code: "PROCEDURE_NOT_ACTIVE" }),
    );
  });

  it("refuses a resolution the stage does not allow", () => {
    expect(() => resolve(withSupport({}, "senate_trial"), "archived", 20)).toThrow(
      expect.objectContaining({ code: "INVALID_PROCEDURE_TRANSITION" }),
    );
  });

  it("lets a mandate end the procedure from wherever it stood", () => {
    const expired = resolve(withSupport({}, "chamber_campaign"), "expired", MANDATE_TURNS);

    expect(expired).toMatchObject({ stage: "expired", status: "resolved", resolution: "expired" });
    expect(isResolution(expired.stage)).toBe(true);
  });
});

// A house is no longer a percentage of itself: the blocs decide what pressure converts into, so a
// vote is described by the state that produced it, not by a share typed into the fixture.
const state = ({ evidence = 50, ...support }) => ({ evidence, ...support });

describe("the votes", () => {
  it("counts against the thresholds the country declares, never its own", () => {
    expect(brazil.removal.chamber.authorizationVotes).toBe(342);
    expect(brazil.removal.senate.admissibilityVotes).toBe(41);
    expect(brazil.removal.senate.convictionVotes).toBe(54);

    const vote = resolveChamberVote(withSupport(state({ evidence: 85, chamber: 78 })), brazil);

    expect(vote.authorised).toBe(vote.votes >= brazil.removal.chamber.authorizationVotes);
  });

  it("archives the petition when the accusation is thin, however hostile the chamber", () => {
    const vote = resolveChamberVote(
      withSupport(
        state({
          evidence: 25,
          chamber: 70,
          coalitionCohesion: 45,
          publicPressure: 40,
          institutionalCredibility: 60,
        }),
      ),
      brazil,
    );

    expect(vote.votes).toBeLessThan(brazil.removal.chamber.authorizationVotes);
    expect(vote.authorised).toBe(false);
    expect(vote.next).toBe("archived");
  });

  it("authorises the process when the record is heavy and the coalition has broken", () => {
    const vote = resolveChamberVote(
      withSupport(
        state({
          evidence: 85,
          chamber: 78,
          coalitionCohesion: 20,
          publicPressure: 80,
          institutionalCredibility: 25,
        }),
      ),
      brazil,
    );

    expect(vote.votes).toBeGreaterThanOrEqual(brazil.removal.chamber.authorizationVotes);
    expect(vote.authorised).toBe(true);
    expect(vote.next).toBe("senate_admissibility");
  });

  it("does not open the trial on hostility with nothing behind it", () => {
    const vote = resolveSenateAdmissibility(
      withSupport(
        state({
          evidence: 25,
          senate: 60,
          coalitionCohesion: 45,
          publicPressure: 40,
          institutionalCredibility: 60,
        }),
        "senate_admissibility",
      ),
      brazil,
    );

    expect(vote.votes).toBeLessThan(brazil.removal.senate.admissibilityVotes);
    expect(vote.opened).toBe(false);
    expect(vote.next).toBe("archived");
  });

  it("opens the trial on an absolute majority", () => {
    const vote = resolveSenateAdmissibility(
      withSupport(
        state({ evidence: 55, senate: 55, coalitionCohesion: 55, publicPressure: 60 }),
        "senate_admissibility",
      ),
      brazil,
    );

    expect(vote.votes).toBeGreaterThanOrEqual(brazil.removal.senate.admissibilityVotes);
    expect(vote.opened).toBe(true);
    expect(vote.next).toBe("suspended");
  });

  it("acquits when the Senate opened the trial but cannot reach two thirds", () => {
    const vote = resolveSenateTrial(
      withSupport(
        state({ evidence: 55, senate: 55, coalitionCohesion: 55, publicPressure: 60 }),
        "senate_trial",
      ),
      brazil,
    );

    expect(vote.votes).toBeGreaterThanOrEqual(brazil.removal.senate.admissibilityVotes);
    expect(vote.votes).toBeLessThan(brazil.removal.senate.convictionVotes);
    expect(vote.convicted).toBe(false);
    expect(vote.next).toBe("acquitted");
  });

  it("removes the president when two thirds of the Senate convict", () => {
    const vote = resolveSenateTrial(
      withSupport(
        state({
          evidence: 72,
          senate: 66,
          coalitionCohesion: 32,
          publicPressure: 70,
          institutionalCredibility: 35,
        }),
        "senate_trial",
      ),
      brazil,
    );

    expect(vote.votes).toBeGreaterThanOrEqual(brazil.removal.senate.convictionVotes);
    expect(vote.convicted).toBe(true);
    expect(vote.next).toBe("removed");
  });

  it("leaves part of every house standing, even with every driver at its worst", () => {
    const collapse = withSupport(
      state({
        evidence: 100,
        chamber: 100,
        senate: 100,
        coalitionCohesion: 0,
        publicPressure: 100,
        institutionalCredibility: 0,
      }),
    );

    // The loyal benches cannot be carried across their tipping point by pressure alone, so a
    // near-unanimous parliament stays out of reach however extreme the crisis becomes.
    expect(countChamberVotes(collapse, brazil) / brazil.removal.chamber.seats).toBeLessThan(0.95);
    expect(countSenateVotes(collapse, brazil) / brazil.removal.senate.seats).toBeLessThan(0.95);
  });

  it("never reports fewer votes than none", () => {
    const quiet = withSupport(
      state({
        evidence: 0,
        chamber: 0,
        senate: 0,
        coalitionCohesion: 100,
        publicPressure: 0,
        institutionalCredibility: 100,
      }),
    );

    expect(countChamberVotes(quiet, brazil)).toBeGreaterThanOrEqual(0);
    expect(countChamberVotes(quiet, brazil)).toBeLessThan(
      brazil.removal.chamber.authorizationVotes,
    );
  });

  it("counts the same house the same way every time", () => {
    const procedure = withSupport(state({ evidence: 64, chamber: 58 }));
    const once = resolveChamberVote(procedure, brazil);
    const twice = resolveChamberVote(procedure, brazil);

    expect(once).toEqual(twice);
  });

  it("shows an estimate as a band that contains the count, never the count itself", () => {
    const procedure = withSupport(state({ evidence: 64, chamber: 58 }));
    const votes = countChamberVotes(procedure, brazil);
    const range = estimateRange(votes, brazil.removal.chamber.seats);

    expect(range.low).toBeLessThan(votes);
    expect(range.high).toBeGreaterThan(votes);
  });
});

describe("pressure from a decision", () => {
  it("moves the numbers the card carries and clamps them", () => {
    const pushed = applyProcedureEffects(withSupport({ chamber: 50, senate: 50 }), {
      chamber: 12,
      senate: -8,
      evidence: 200,
    });

    expect(pushed.support.chamber).toBe(62);
    expect(pushed.support.senate).toBe(42);
    expect(pushed.evidence).toBe(100);
  });

  it("ignores anything the card did not name", () => {
    const base = withSupport({ chamber: 44 });
    const pushed = applyProcedureEffects(base, { evidence: 5 });

    expect(pushed.support).toEqual(base.support);
  });
});

describe("the suspension deadline", () => {
  it("lasts the six turns the constitution allows", () => {
    expect(suspensionDeadline(brazil, 20)).toBe(26);
    expect(brazil.removal.suspensionTurns).toBe(6);
  });

  it("expires once the deadline passes, and not before", () => {
    const suspended = { ...withSupport({}, "suspended"), deadlineTurn: 26 };

    expect(isExpired(suspended, 26)).toBe(false);
    expect(isExpired(suspended, 27)).toBe(true);
  });

  it("never expires a procedure that is already resolved", () => {
    const archived = resolve(withSupport({}, "speaker_review"), "archived", 14);

    expect(isExpired({ ...archived, deadlineTurn: 1 }, 48)).toBe(false);
  });
});
