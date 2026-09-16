import { AppError, ConflictError, DomainRuleError } from "../errors/index.js";
import {
  CHOICE_SIDES,
  EVENT_STATUS,
  GAME_STATUS,
  MANDATE_COMPLETED_ENDING_CODE,
  MANDATE_TURNS,
  PRESIDENT_ROLE,
} from "./constants.js";
import { getChoiceConsequence } from "./consequence.js";
import { applyDeltas, resolveChoiceDeltas } from "./effects.js";
import { evaluateCollapse } from "./endings.js";
import { applyFlagOperations, expireFlags } from "./flags.js";
import { createInitialMeters } from "./meters.js";
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

function finishedResult(state, { decision, created, ending }) {
  return {
    state,
    decision,
    expiredFlags: [],
    eventChanges: { created, firedSequence: null, cancelledSequences: [] },
    appearance: null,
    ending,
    gameOver: true,
    warnings: [],
  };
}

// Pure resolution of one month (GDD §12.2 steps 5–12). Persistence and locking live in services.
export function resolveTurn({ state, cards, choice, appearances, scheduledEvents, rng }) {
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

  if (collapse) {
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
        ending: {
          code: collapse.primary.endingCode,
          primaryMeter: collapse.primary.meter,
          simultaneousEndingCodes,
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
  const selection = selectCard({
    cards,
    role: state.role,
    turn: nextTurn,
    flags,
    meters,
    appearances,
    lastCardSlug: card.slug,
    scheduledEvents: [...scheduledEvents, ...created],
    rng: rng ?? createTurnRng(state.rngSeed, nextTurn),
  });

  return {
    state: { ...decided, turn: nextTurn, flags, currentCardSlug: selection.card.slug },
    decision,
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
