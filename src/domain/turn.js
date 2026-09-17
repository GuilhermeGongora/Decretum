import { AppError, ConflictError, DomainRuleError } from "../errors/index.js";
import {
  CHOICE_SIDES,
  EVENT_STATUS,
  GAME_STATUS,
  MANDATE_COMPLETED_ENDING_CODE,
  MANDATE_TURNS,
  PRESIDENT_ROLE,
  PROCEDURE_STATUS,
  REMOVED_ENDING_CODE,
} from "./constants.js";
import { applyCabinetOperations } from "./cabinet.js";
import { getChoiceConsequence } from "./consequence.js";
import { applyDeltas, resolveChoiceDeltas } from "./effects.js";
import { evaluateCollapse } from "./endings.js";
import { applyFlagOperations, expireFlags } from "./flags.js";
import { createInitialMeters } from "./meters.js";
import {
  applyProcedureEffects,
  evaluateGrounds,
  isResolution,
  nextStage,
  openProcedure,
  record,
  resolve,
  resolveChamberVote,
  resolveSenateAdmissibility,
  resolveSenateTrial,
  suspensionDeadline,
  transition,
} from "./procedure.js";
import { createTurnRng } from "./rng.js";
import { selectCard } from "./selection.js";

export function startGame({
  cards,
  rngSeed,
  role = PRESIDENT_ROLE,
  meters = createInitialMeters(),
  flags = {},
  previousGameId = null,
  rng = createTurnRng(rngSeed, 1),
}) {
  const turn = 1;
  const selection = selectCard({
    cards,
    role,
    turn,
    flags,
    meters,
    procedure: null,
    appearances: [],
    lastCardSlug: null,
    scheduledEvents: [],
    rng,
  });

  const state = {
    role,
    status: GAME_STATUS.ACTIVE,
    turn,
    meters,
    flags,
    currentCardSlug: selection.card.slug,
    lastCardSlug: null,
    previousGameId,
    mandateCompleted: false,
    endingCode: null,
    simultaneousEndingCodes: [],
    rngSeed,
  };

  return { state, appearance: { turn, cardSlug: selection.card.slug }, selection };
}

function createScheduledEvents(schedule, existingEvents, turn) {
  let sequence = existingEvents.reduce((max, event) => Math.max(max, event.sequence), 0);

  return schedule.map((entry) => {
    sequence += 1;
    return {
      sequence,
      cardSlug: entry.cardSlug,
      turnDue: turn + entry.delayTurns,
      priority: entry.priority ?? 0,
      status: EVENT_STATUS.PENDING,
      createdAtTurn: turn,
    };
  });
}

function finishedResult(
  state,
  { decision, created, ending, procedure = null, cabinet = null, cabinetChanges = [] },
) {
  return {
    state,
    decision,
    procedure,
    cabinet,
    cabinetChanges,
    expiredFlags: [],
    eventChanges: { created, firedSequence: null, cancelledSequences: [] },
    appearance: null,
    ending,
    gameOver: true,
    warnings: [],
  };
}

// One step of the constitutional chain. A card may push the numbers and may ask the procedure to move
// on, but never decides where it goes: the three voting stages are counted against the country's own
// thresholds, and every other stage has a single successor.
function advanceProcedure(procedure, country, turn) {
  if (!country) {
    throw new AppError("A procedure cannot advance without its country pack", {
      code: "PROCEDURE_COUNTRY_MISSING",
    });
  }

  switch (procedure.stage) {
    case "chamber_vote": {
      const vote = resolveChamberVote(procedure, country);
      const moved = transition({ ...procedure, chamberVotes: vote.votes }, vote.next);
      return { procedure: record(moved, turn, `Câmara: ${vote.votes} votos`), votes: vote.votes };
    }
    case "senate_admissibility": {
      const vote = resolveSenateAdmissibility(procedure, country);
      const moved = transition({ ...procedure, senateVotes: vote.votes }, vote.next);
      return {
        procedure: record(
          vote.opened ? { ...moved, deadlineTurn: suspensionDeadline(country, turn) } : moved,
          turn,
          `Senado: ${vote.votes} votos pela instauração`,
        ),
        votes: vote.votes,
      };
    }
    case "senate_trial": {
      const vote = resolveSenateTrial(procedure, country);
      const moved = transition({ ...procedure, senateVotes: vote.votes }, vote.next);
      return {
        procedure: record(moved, turn, `Senado: ${vote.votes} votos pela condenação`),
        votes: vote.votes,
      };
    }
    default: {
      const target = nextStage(procedure.stage);
      if (!target) {
        throw new DomainRuleError(`A procedure at ${procedure.stage} has nowhere to advance to`, {
          code: "INVALID_PROCEDURE_TRANSITION",
        });
      }
      return { procedure: record(transition(procedure, target), turn, null), votes: null };
    }
  }
}

// Some links of the chain cannot be scheduled by content, because only the engine knows where they
// land: the stage a count reaches, the opening of a procedure and its outcomes. The country pack
// names the card for each of those, so no card slug ever reaches the engine. It is scheduled with a
// high priority, so the constitutional moment outranks whatever else was pending that month.
function summonProcedureCard(country, stage, scheduledEvents, created, turn) {
  const cardSlug = country?.removal?.cards?.[stage];
  if (!cardSlug) return [];

  return createScheduledEvents(
    [{ cardSlug, delayTurns: 1, priority: 100 }],
    [...scheduledEvents, ...created],
    turn,
  );
}

// The decision's own pressure on a running procedure: numbers first, then the step the card asked for.
function stepProcedure(procedure, option, country, turn) {
  let next = applyProcedureEffects(procedure, option.procedure);
  let votes = null;

  if (option.procedure.resolve) {
    next = resolve(next, option.procedure.resolve, turn);
  } else if (option.procedure.advance) {
    const step = advanceProcedure(next, country, turn);
    next = step.procedure;
    votes = step.votes;
  }

  // A vote that landed on an outcome closes the procedure in the same month.
  if (isResolution(next.stage) && next.status === PROCEDURE_STATUS.ACTIVE) {
    next = resolve(next, next.stage, turn);
  }

  return { procedure: next, votes };
}

// Pure resolution of one month (GDD §12.2 steps 5–12). Persistence and locking live in services.
// `country` and `procedure` are optional: without them the month behaves exactly as it always did,
// which is what keeps governments created before the constitutional chain playable.
export function resolveTurn({
  state,
  cards,
  choice,
  appearances,
  scheduledEvents,
  rng,
  country = null,
  procedure = null,
  cabinet = null,
}) {
  if (state.status !== GAME_STATUS.ACTIVE) {
    throw new ConflictError("This government is no longer active", { code: "GAME_NOT_ACTIVE" });
  }
  if (!CHOICE_SIDES.includes(choice)) {
    throw new DomainRuleError(`Invalid choice: ${String(choice)}`, { code: "INVALID_CHOICE" });
  }

  const card = cards.find((candidate) => candidate.slug === state.currentCardSlug);
  if (!card) {
    throw new AppError(`Current card "${state.currentCardSlug}" is not available`, {
      code: "CURRENT_CARD_MISSING",
    });
  }

  const { turn } = state;
  const option = card.choices[choice];
  const deltas = resolveChoiceDeltas(option, state.meters);
  const { raw, meters } = applyDeltas(state.meters, deltas);
  const { flags: flagsAfterDecision, changes: flagChanges } = applyFlagOperations(
    state.flags,
    option,
    turn,
  );
  const created = createScheduledEvents(option.schedule ?? [], scheduledEvents, turn);

  // The cabinet answers to the same decision. A government created before the cabinet existed holds
  // none, and the month simply passes it by.
  const { cabinet: nextCabinet, changes: cabinetChanges } = cabinet
    ? applyCabinetOperations(cabinet, option, turn)
    : { cabinet: null, changes: [] };

  let nextProcedure = procedure;
  let procedureVotes = null;
  if (nextProcedure && nextProcedure.status === PROCEDURE_STATUS.ACTIVE && option.procedure) {
    const step = stepProcedure(nextProcedure, option, country, turn);
    nextProcedure = step.procedure;
    procedureVotes = step.votes;
    // The chain moved: whatever stage or outcome it reached may summon its own card.
    if (nextProcedure.stage !== procedure.stage) {
      created.push(
        ...summonProcedureCard(country, nextProcedure.stage, scheduledEvents, created, turn),
      );
    }
  }

  const decision = {
    turn,
    cardSlug: card.slug,
    cardVersion: card.version,
    speaker: card.speaker,
    cardText: card.text,
    choice,
    choiceLabel: option.label,
    resultText: option.resultText,
    // Immutable snapshot of what the player read; never rebuilt later from the current card.
    consequence: getChoiceConsequence(card, choice),
    deltas,
    metersBefore: state.meters,
    metersAfter: meters,
    flagChanges,
    scheduledEvents: created.map(({ cardSlug, turnDue }) => ({ cardSlug, turnDue })),
  };

  const decided = { ...state, meters, flags: flagsAfterDecision, lastCardSlug: card.slug };
  const collapse = evaluateCollapse({ raw, meters });

  // A conviction outranks a pillar collapse in the same month. The choices that carry a government to
  // the Senate usually wreck Congress on the way, so without this the removal ending would almost
  // never be reached: the chronicle would record a drift out of governability instead of a verdict.
  if (collapse && nextProcedure?.resolution !== "removed") {
    const simultaneousEndingCodes = collapse.simultaneous.map((crisis) => crisis.endingCode);
    return finishedResult(
      {
        ...decided,
        status: GAME_STATUS.ENDED,
        currentCardSlug: null,
        endingCode: collapse.primary.endingCode,
        simultaneousEndingCodes,
      },
      {
        decision,
        created,
        procedure: nextProcedure,
        cabinet: nextCabinet,
        cabinetChanges,
        ending: {
          code: collapse.primary.endingCode,
          primaryMeter: collapse.primary.meter,
          simultaneousEndingCodes,
        },
      },
    );
  }

  // Conviction ends the government with its own ending, after the pillars had their say.
  if (nextProcedure?.resolution === "removed") {
    return finishedResult(
      {
        ...decided,
        status: GAME_STATUS.ENDED,
        currentCardSlug: null,
        endingCode: REMOVED_ENDING_CODE,
        simultaneousEndingCodes: [],
      },
      {
        decision,
        created,
        procedure: nextProcedure,
        cabinet: nextCabinet,
        cabinetChanges,
        ending: {
          code: REMOVED_ENDING_CODE,
          primaryMeter: null,
          simultaneousEndingCodes: [],
          procedureVotes,
        },
      },
    );
  }

  if (turn >= MANDATE_TURNS) {
    return finishedResult(
      {
        ...decided,
        status: GAME_STATUS.COMPLETED,
        currentCardSlug: null,
        mandateCompleted: true,
        endingCode: MANDATE_COMPLETED_ENDING_CODE,
      },
      {
        decision,
        created,
        // A mandate that ends first takes the procedure with it.
        procedure:
          nextProcedure && nextProcedure.status === PROCEDURE_STATUS.ACTIVE
            ? resolve(nextProcedure, "expired", turn, "O mandato terminou antes do julgamento.")
            : nextProcedure,
        cabinet: nextCabinet,
        cabinetChanges,
        ending: {
          code: MANDATE_COMPLETED_ENDING_CODE,
          primaryMeter: null,
          simultaneousEndingCodes: [],
        },
      },
    );
  }

  const nextTurn = turn + 1;
  const { flags, expired } = expireFlags(flagsAfterDecision, nextTurn);

  // Suspension has a constitutional limit: past it, the procedure dies instead of the government.
  if (
    nextProcedure &&
    nextProcedure.status === PROCEDURE_STATUS.ACTIVE &&
    nextProcedure.deadlineTurn !== null &&
    nextTurn > nextProcedure.deadlineTurn
  ) {
    nextProcedure = resolve(
      nextProcedure,
      "expired",
      nextTurn,
      "O prazo do afastamento terminou sem julgamento.",
    );
  }

  // With no procedure running, the accumulated record may itself open one. Only where the country
  // declares a removal procedure at all: a pack without one is valid content, and asking it for
  // grounds it never defined is how a month ends in a crash instead of a card.
  if (!nextProcedure && country?.removal) {
    const assessment = evaluateGrounds({ country, flags, meters, turn: nextTurn });
    if (assessment.opens) {
      nextProcedure = openProcedure({ country, assessment, turn: nextTurn });
      created.push(
        ...summonProcedureCard(country, nextProcedure.stage, scheduledEvents, created, turn),
      );
    }
  }

  const selection = selectCard({
    cards,
    role: state.role,
    turn: nextTurn,
    flags,
    meters,
    procedure:
      nextProcedure && nextProcedure.status === PROCEDURE_STATUS.ACTIVE ? nextProcedure : null,
    appearances,
    lastCardSlug: card.slug,
    scheduledEvents: [...scheduledEvents, ...created],
    rng: rng ?? createTurnRng(state.rngSeed, nextTurn),
  });

  return {
    state: { ...decided, turn: nextTurn, flags, currentCardSlug: selection.card.slug },
    decision,
    procedure: nextProcedure,
    procedureVotes,
    cabinet: nextCabinet,
    cabinetChanges,
    expiredFlags: expired,
    eventChanges: {
      created,
      firedSequence: selection.firedEventSequence,
      cancelledSequences: selection.cancelledEventSequences,
    },
    appearance: { turn: nextTurn, cardSlug: selection.card.slug },
    ending: null,
    gameOver: false,
    warnings: selection.warnings,
  };
}

export function applyEventChanges(
  events,
  { created = [], firedSequence = null, cancelledSequences = [] },
) {
  const cancelled = new Set(cancelledSequences);

  return [...events, ...created].map((event) => {
    if (event.sequence === firedSequence) return { ...event, status: EVENT_STATUS.FIRED };
    if (cancelled.has(event.sequence)) return { ...event, status: EVENT_STATUS.CANCELLED };
    return event;
  });
}
