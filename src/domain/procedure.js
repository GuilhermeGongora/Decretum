import { DomainRuleError } from "../errors/index.js";
import { MANDATE_TURNS, PROCEDURE_STATUS } from "./constants.js";
import { isFlagActive } from "./flags.js";

// A constitutional procedure that runs across months next to the card loop. Pure: it receives the
// country pack as an argument and never imports content, so the thresholds and the vocabulary belong
// to the country and only the chain itself lives here.
//
// Every transition is explicit. Anything not listed is impossible, which is what keeps two concurrent
// requests from inventing a stage.
const TRANSITIONS = Object.freeze({
  grounds_emerging: ["petition_filed", "archived"],
  petition_filed: ["speaker_review"],
  speaker_review: ["chamber_campaign", "archived"],
  chamber_campaign: ["chamber_vote"],
  chamber_vote: ["senate_admissibility", "archived"],
  senate_admissibility: ["suspended", "archived"],
  suspended: ["senate_trial"],
  senate_trial: ["acquitted", "removed"],
});

// The ordered chain. `nextStage` is the only way a non-voting stage moves, so the sequence lives in
// exactly one place and a stage can never be skipped.
const CHAIN = Object.freeze([
  "grounds_emerging",
  "petition_filed",
  "speaker_review",
  "chamber_campaign",
  "chamber_vote",
  "senate_admissibility",
  "suspended",
  "senate_trial",
]);

const RESOLUTIONS = Object.freeze(["archived", "acquitted", "removed", "expired"]);

export function nextStage(stage) {
  const index = CHAIN.indexOf(stage);
  return index >= 0 && index + 1 < CHAIN.length ? CHAIN[index + 1] : null;
}

const SUPPORT_KEYS = Object.freeze([
  "chamber",
  "senate",
  "coalitionCohesion",
  "publicPressure",
  "institutionalCredibility",
]);

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(value)));

export const isResolution = (stage) => RESOLUTIONS.includes(stage);

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

// The one place a stage changes. An invalid step is a bug, not a game outcome.
export function transition(procedure, to) {
  if (procedure.status !== PROCEDURE_STATUS.ACTIVE) {
    throw new DomainRuleError("This procedure has already been resolved", {
      code: "PROCEDURE_NOT_ACTIVE",
    });
  }
  if (!canTransition(procedure.stage, to)) {
    throw new DomainRuleError(`Cannot move a procedure from ${procedure.stage} to ${to}`, {
      code: "INVALID_PROCEDURE_TRANSITION",
    });
  }
  return { ...procedure, stage: to };
}

/**
 * Does the government stand on impeachable ground?
 *
 * Never one flag, never one low pillar: the country lists what counts as grounds and which flags
 * evidence them, and a petition only becomes possible when several grounds are documented *and* the
 * political ground is there to carry it. Fully deterministic.
 */
export function evaluateGrounds({ country, flags, meters, turn }) {
  const catalog = country.removal.grounds;
  const matched = catalog.filter((ground) =>
    (ground.flags ?? []).some((key) => isFlagActive(flags, key)),
  );

  const evidence = clamp(matched.reduce((total, ground) => total + ground.weight, 0));
  // Hostility in Congress carries a petition; the streets and the courts decide whether it is heard.
  const viability = clamp(
    (100 - meters.congress) * 0.5 + (100 - meters.institutions) * 0.3 + (100 - meters.people) * 0.2,
  );

  return {
    grounds: matched.map((ground) => ground.key),
    primary: matched.reduce(
      (worst, ground) => (worst === null || ground.weight > worst.weight ? ground : worst),
      null,
    ),
    evidence,
    viability,
    // Two documented grounds, real evidence, and a Congress willing to use them.
    opens: matched.length >= 2 && evidence >= 45 && viability >= 50 && turn >= 6,
  };
}

export function openProcedure({ country, assessment, turn }) {
  if (!assessment.opens) {
    throw new DomainRuleError("There are no sufficient grounds for a procedure", {
      code: "INSUFFICIENT_GROUNDS",
    });
  }

  return {
    type: country.removal.type,
    countryCode: country.countryCode,
    stage: "grounds_emerging",
    status: PROCEDURE_STATUS.ACTIVE,
    grounds: assessment.primary.key,
    evidence: assessment.evidence,
    support: {
      // Support for removal, not for the government: the petition starts from the hostility measured.
      chamber: clamp(assessment.viability * 0.7 + assessment.evidence * 0.3),
      senate: clamp(assessment.viability * 0.6 + assessment.evidence * 0.3),
      coalitionCohesion: clamp(100 - assessment.viability),
      publicPressure: clamp(assessment.evidence * 0.6 + assessment.viability * 0.4),
      institutionalCredibility: clamp(100 - assessment.evidence),
    },
    chamberVotes: null,
    senateVotes: null,
    openedAtTurn: turn,
    deadlineTurn: null,
    resolution: null,
    resolvedAtTurn: null,
    timeline: [{ turn, stage: "grounds_emerging", note: assessment.primary.label }],
  };
}

// Card choices carry their own pressure on the procedure; the engine only clamps what it is handed.
export function applyProcedureEffects(procedure, effects = {}) {
  const support = { ...procedure.support };
  for (const key of SUPPORT_KEYS) {
    if (effects[key] !== undefined) support[key] = clamp(support[key] + effects[key]);
  }

  return {
    ...procedure,
    evidence:
      effects.evidence === undefined
        ? procedure.evidence
        : clamp(procedure.evidence + effects.evidence),
    support,
  };
}

const votesFrom = (seats, support) =>
  Math.min(seats, Math.max(0, Math.round((seats * support) / 100)));

export function countChamberVotes(procedure, country) {
  return votesFrom(country.removal.chamber.seats, procedure.support.chamber);
}

export function countSenateVotes(procedure, country) {
  return votesFrom(country.removal.senate.seats, procedure.support.senate);
}

// The three counts of the chain. Each one is a pure comparison against the country's own thresholds.
export function resolveChamberVote(procedure, country) {
  const votes = countChamberVotes(procedure, country);
  const authorised = votes >= country.removal.chamber.authorizationVotes;
  return { votes, authorised, next: authorised ? "senate_admissibility" : "archived" };
}

export function resolveSenateAdmissibility(procedure, country) {
  const votes = countSenateVotes(procedure, country);
  const opened = votes >= country.removal.senate.admissibilityVotes;
  return { votes, opened, next: opened ? "suspended" : "archived" };
}

export function resolveSenateTrial(procedure, country) {
  const votes = countSenateVotes(procedure, country);
  const convicted = votes >= country.removal.senate.convictionVotes;
  return { votes, convicted, next: convicted ? "removed" : "acquitted" };
}

// Suspension has a constitutional limit, and no procedure outlives the mandate it judges.
export function suspensionDeadline(country, turn) {
  return turn + country.removal.suspensionTurns;
}

export function isExpired(procedure, turn) {
  if (procedure.status !== PROCEDURE_STATUS.ACTIVE) return false;
  if (turn > MANDATE_TURNS) return true;
  return procedure.deadlineTurn !== null && turn > procedure.deadlineTurn;
}

export function resolve(procedure, resolution, turn, note = null) {
  if (!RESOLUTIONS.includes(resolution)) {
    throw new DomainRuleError(`Unknown procedure resolution: ${String(resolution)}`, {
      code: "INVALID_PROCEDURE_RESOLUTION",
    });
  }
  // A mandate ending closes a procedure from wherever it stood; every other outcome has to be a legal
  // step from the current stage, so content cannot archive a trial or convict at the petition desk.
  if (
    resolution !== "expired" &&
    !isResolution(procedure.stage) &&
    !canTransition(procedure.stage, resolution)
  ) {
    throw new DomainRuleError(`Cannot resolve a procedure at ${procedure.stage} as ${resolution}`, {
      code: "INVALID_PROCEDURE_TRANSITION",
    });
  }

  return {
    ...procedure,
    stage: resolution,
    status: PROCEDURE_STATUS.RESOLVED,
    resolution,
    resolvedAtTurn: turn,
    timeline: [...procedure.timeline, { turn, stage: resolution, note }],
  };
}

export function record(procedure, turn, note) {
  return {
    ...procedure,
    timeline: [...procedure.timeline, { turn, stage: procedure.stage, note }],
  };
}

// What the interface may show before a vote: a band, never the exact count the engine already knows.
export function estimateRange(votes, seats) {
  const spread = Math.max(4, Math.round(seats * 0.02));
  return { low: Math.max(0, votes - spread), high: Math.min(seats, votes + spread) };
}
