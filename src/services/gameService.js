import { randomUUID } from "node:crypto";
import { loadContent } from "@/src/content";
// The registry is read straight from content, the way the epithets are: `loadContent()` validates it
// and compiles the cards from it, but deliberately does not carry it in the frozen result.
import { characters } from "@/src/content/characters";
import { epithetDefinitions } from "@/src/content/epithets";
import { withTransaction } from "@/src/database/transaction";
import { EVENT_STATUS, GAME_STATUS, MONTHS_PER_YEAR } from "@/src/domain/constants";
import { applyDeltas } from "@/src/domain/effects";
import { resolveCampaign, resolveCandidateTraits } from "@/src/domain/election";
import { buildSuccessorStart } from "@/src/domain/successor";
import { buildGameSummary } from "@/src/domain/summary";
import { resolveTurn, startGame } from "@/src/domain/turn";
import { ConflictError, DomainRuleError, NotFoundError } from "@/src/errors";
import { findAllCards } from "@/src/repositories/cardRepository";
import { findDecisions, insertDecision } from "@/src/repositories/decisionRepository";
import { findAllEndings } from "@/src/repositories/endingRepository";
import { findGameById, insertGame, updateGame } from "@/src/repositories/gameRepository";
import {
  findAppearances,
  findFlags,
  findScheduledEvents,
  insertAppearance,
  insertScheduledEvents,
  replaceFlags,
  updateScheduledEventStatus,
} from "@/src/repositories/gameStateRepository";
import { applyCabinetAction, createCabinet, restoreCabinet } from "@/src/domain/cabinet";
import { findCabinetSeats, replaceCabinetSeats } from "@/src/repositories/cabinetRepository";
import {
  countManualActionsAtTurn,
  findCabinetActions,
  insertCabinetAction,
} from "@/src/repositories/cabinetActionRepository";
import {
  findActiveProcedure,
  findProcedures,
  insertProcedure,
  updateProcedure,
} from "@/src/repositories/procedureRepository";
import {
  toCabinetChangeViews,
  toCabinetChronicleView,
  toCabinetView,
  toCardView,
  toCourtRulingView,
  toDecisionView,
  toEndingView,
  toGameView,
  toProcedureChronicleView,
  toProcedureView,
  toSummaryView,
} from "@/src/services/gameViews";
import { logger } from "@/src/utils/logger";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Brazil is the only playable pack, and the deck is Brazilian: governments without an explicit
// country — including every government created before the country column — are Brazilian.
const DEFAULT_COUNTRY_CODE = "BR";

function gameNotFound() {
  return new NotFoundError("Government not found", { code: "GAME_NOT_FOUND" });
}

// Malformed ids are reported as not found so the database never sees invalid uuids.
function assertGameId(gameId) {
  if (typeof gameId !== "string" || !UUID_PATTERN.test(gameId)) throw gameNotFound();
}

function isUniqueViolation(error, constraint) {
  return error?.code === "23505" && error.constraint === constraint;
}

function findCountry(countryCode) {
  return loadContent().countries[countryCode ?? DEFAULT_COUNTRY_CODE] ?? null;
}

function requirePlayableCountry(countryCode) {
  const country = findCountry(countryCode);
  if (!country) {
    throw new DomainRuleError(`Unknown country: ${countryCode}`, { code: "UNKNOWN_COUNTRY" });
  }
  if (!country.playable) {
    throw new DomainRuleError(`${country.name} is still in development`, {
      code: "COUNTRY_NOT_PLAYABLE",
    });
  }
  return country;
}

// Flags the campaign produced, in the shape the engine and the database expect.
function toFlagRecords(keys, catalog) {
  return Object.fromEntries(
    keys.map((key) => {
      const definition = catalog[key];
      return [
        key,
        {
          value: true,
          label: definition.label,
          legacy: definition.legacy ?? false,
          legacyPriority: definition.legacyPriority ?? 0,
          successorEffects: definition.legacy ? definition.successorEffects : null,
          setAtTurn: 1,
          expiresAtTurn: null,
          inherited: false,
        },
      ];
    }),
  );
}

// Labels are copied so the election night and the chronicle keep reading well even if content changes.
function buildCandidateSnapshot(country, candidate) {
  const [treatment, origin, style, party, coalition, promise] = resolveCandidateTraits(
    country,
    candidate,
  );

  return {
    name: candidate.name,
    treatment: { key: treatment.key, label: treatment.label },
    origin: { key: origin.key, label: origin.label },
    style: { key: style.key, label: style.label },
    party: { key: party.key, name: party.name, acronym: party.acronym },
    coalition: { key: coalition.key, label: coalition.label },
    promise: { key: promise.key, label: promise.label },
  };
}

async function loadSnapshot(client, gameId, cards) {
  const game = await findGameById(client, gameId);
  if (!game) throw gameNotFound();
  const country = findCountry(game.countryCode);

  // The chain a government went through, running or already judged. Null for the governments that
  // never faced one, which is every government created before the procedures table existed.
  const procedures = await findProcedures(client, gameId);
  const procedure = toProcedureView(procedures.at(-1) ?? null, country, game.turn);

  // The government the president actually holds, in public words. A suspended presidency may not
  // reorganise it, so the view is told, and it stops offering actions the server would refuse.
  const cabinet = toCabinetView(
    restoreCabinet(country, await findCabinetSeats(client, gameId)),
    country,
    {
      turn: game.turn,
      actionsUsed: await countManualActionsAtTurn(client, gameId, game.turn),
      suspended: procedure?.presidency?.key === "suspended",
      active: game.status === GAME_STATUS.ACTIVE,
    },
  );

  if (game.status === GAME_STATUS.ACTIVE) {
    const card = cards.find((candidate) => candidate.slug === game.currentCardSlug);
    return {
      game: toGameView(game, country),
      currentCard: toCardView(card, game.meters),
      procedure,
      cabinet,
      ending: null,
      summary: null,
    };
  }

  const decisions = await findDecisions(client, gameId);
  const flags = await findFlags(client, gameId);
  const endings = await findAllEndings(client);
  const summary = buildGameSummary({ state: { ...game, flags }, decisions });

  return {
    game: toGameView(game, country),
    currentCard: null,
    // A government that ended still carries the process that ended it: the archive has to stay
    // readable after the last month, and a removal is told by the procedure, not only by the ending.
    procedure,
    // A government that ended is still read: the archive shows the cabinet it fell with.
    cabinet,
    ending: toEndingView(game.endingCode, endings),
    summary: toSummaryView(summary, { endings, epithets: epithetDefinitions }),
  };
}

async function insertStartedGame(
  client,
  { cards, startYear, meters, flags, previousGameId, countryCode, candidate, election },
) {
  const { state, appearance } = startGame({
    cards,
    rngSeed: randomUUID(),
    meters,
    flags,
    previousGameId,
  });

  let gameId;
  try {
    gameId = await insertGame(client, { state, startYear, countryCode, candidate, election });
  } catch (error) {
    if (isUniqueViolation(error, "games_one_successor")) {
      throw new ConflictError("A successor government already exists", {
        code: "SUCCESSOR_ALREADY_EXISTS",
        cause: error,
      });
    }
    throw error;
  }

  await replaceFlags(client, gameId, state.flags);
  // A government takes office with the cabinet its own country describes. The country is resolved
  // here rather than passed in, so every way of starting a government — elected or successor —
  // seats one, and a future caller cannot quietly skip it.
  await replaceCabinetSeats(client, gameId, createCabinet(findCountry(countryCode)));
  await insertAppearance(client, gameId, appearance);
  return gameId;
}

// The electoral prologue is optional: without it a government starts with balanced pillars (GDD §7.2).
export async function createGame({ countryCode, candidate, campaignChoices } = {}) {
  const country = requirePlayableCountry(countryCode);
  const start =
    candidate && campaignChoices
      ? resolveCampaign({ country, candidate, choices: campaignChoices })
      : null;

  // A campaign can be lost, and a lost campaign starts no government: nothing is inserted, nothing
  // is saved and there is nothing to resume. The count still comes back, because the player has to
  // be told how it went.
  if (start?.outcome === "defeated") {
    logger.info("game.campaign_defeated", {
      countryCode: country.countryCode,
      margin: start.election.margin,
    });
    // The candidacy is still described, because the screen has to name who lost and under which
    // party and coalition. Rebuilding those labels in the browser would be a second source of them.
    return {
      outcome: "defeated",
      game: null,
      candidate: buildCandidateSnapshot(country, candidate),
      election: start.election,
    };
  }

  const snapshot = await withTransaction(async (client) => {
    const cards = await findAllCards(client);
    const gameId = await insertStartedGame(client, {
      cards,
      startYear: 1,
      meters: start?.meters,
      flags: start ? toFlagRecords(start.flagKeys, loadContent().flags) : {},
      countryCode: country.countryCode,
      candidate: start ? buildCandidateSnapshot(country, candidate) : null,
      election: start?.election ?? null,
    });
    return loadSnapshot(client, gameId, cards);
  });

  logger.info("game.created", {
    gameId: snapshot.game.id,
    countryCode: country.countryCode,
    elected: Boolean(start),
    cardSlug: snapshot.currentCard.slug,
  });
  return { outcome: "elected", ...snapshot };
}

export async function getGame(gameId) {
  assertGameId(gameId);
  return withTransaction(async (client) =>
    loadSnapshot(client, gameId, await findAllCards(client)),
  );
}

// The constitutional chain is written in the same transaction as the decision that moved it, so a
// month never ends with the procedure and the government disagreeing about where the process stands.
async function persistProcedure(client, gameId, before, after) {
  if (!after) return;
  if (before) {
    await updateProcedure(client, before.id, after);
    return;
  }

  try {
    await insertProcedure(client, gameId, after);
  } catch (error) {
    if (isUniqueViolation(error, "political_procedures_one_active")) {
      throw new ConflictError("A procedure is already running against this government", {
        code: "PROCEDURE_ALREADY_ACTIVE",
        cause: error,
      });
    }
    throw error;
  }
}

// What happened to the constitutional process this month, as an explicit event. The interface opens
// a vote screen because the server said a vote resolved, never because it recognised a headline.
// It carries no internal number: the stage it left, the stage it reached, and the count already
// persisted — which is public the moment the house has voted.
function toProcedureEvent(before, after, votes) {
  if (!after || before?.stage === after.stage) return null;

  if (votes === null || votes === undefined) {
    return { type: "stage_changed", procedureType: after.type, stage: after.stage };
  }
  return {
    type: "vote_resolved",
    procedureType: after.type,
    stage: before.stage,
    next: after.stage,
    votes,
  };
}

/**
 * The Presidency signing one change to its own cabinet.
 *
 * The client sends an intention — which ministry, which candidate — and never an effect, a loyalty
 * or an occupant. Everything else is decided here, inside one transaction holding the game row lock,
 * so two requests racing in the same month cannot both be written.
 *
 * The count of this month's actions is read only so the refusal can be explained. What actually
 * guarantees the limit is the database: the partial unique index over (game_id, turn) for manual
 * actions refuses the second one even when both requests passed the count.
 */
export async function performCabinetAction(gameId, { turn, action, ministryKey, candidateId }) {
  assertGameId(gameId);

  const { snapshot, applied } = await withTransaction(async (client) => {
    const game = await findGameById(client, gameId, { forUpdate: true });
    if (!game) throw gameNotFound();
    if (game.status !== GAME_STATUS.ACTIVE) {
      throw new ConflictError("This government has already ended", { code: "GAME_NOT_ACTIVE" });
    }
    // The month the screen was opened in. A stale one means the board has moved since.
    if (turn !== undefined && turn !== game.turn) {
      throw new ConflictError("This month has already passed", { code: "TURN_ALREADY_DECIDED" });
    }

    const country = findCountry(game.countryCode);
    // Read under the same lock: whether the Presidency is suspended decides whether it may act at
    // all, and the country decides whether that rule applies to it.
    const procedure = await findActiveProcedure(client, gameId, { forUpdate: true });
    const cabinet = restoreCabinet(country, await findCabinetSeats(client, gameId));
    const actionsUsedThisTurn = await countManualActionsAtTurn(client, gameId, game.turn);

    const result = applyCabinetAction(
      cabinet,
      { action, ministryKey, candidateId },
      {
        country,
        characters,
        turn: game.turn,
        actionsUsedThisTurn,
        suspended: procedure?.stage === "suspended",
      },
    );

    try {
      await insertCabinetAction(client, gameId, result.action, "manual");
    } catch (error) {
      if (isUniqueViolation(error, "cabinet_actions_one_manual_per_turn")) {
        throw new ConflictError("This month's cabinet action has already been used", {
          code: "CABINET_ACTION_ALREADY_USED",
          cause: error,
        });
      }
      throw error;
    }

    await replaceCabinetSeats(client, gameId, result.cabinet);
    // The consequences reach the pillars, but a cabinet change never ends a government on its own: a
    // collapse belongs to a month that was decided, with its card, its consequence and its entry in
    // the chronicle.
    const { meters } = applyDeltas(game.meters, result.effects);
    await updateGame(client, gameId, { ...game, meters });

    const cards = await findAllCards(client);
    return { snapshot: await loadSnapshot(client, gameId, cards), applied: result };
  });

  logger.info("game.cabinet_action", {
    gameId,
    turn: applied.action.turn,
    action: applied.action.action,
    ministryKey: applied.action.ministryKey,
  });
  return { ...snapshot, cabinetAction: applied.action };
}

// GDD §12.2: the whole month is resolved inside one transaction holding the game row lock.
export async function decide(gameId, { choice, expectedTurn }) {
  assertGameId(gameId);

  const { result, snapshot, procedureBefore } = await withTransaction(async (client) => {
    const game = await findGameById(client, gameId, { forUpdate: true });
    if (!game) throw gameNotFound();

    if (game.status !== GAME_STATUS.ACTIVE) {
      throw new ConflictError("This government has already ended", { code: "GAME_NOT_ACTIVE" });
    }
    if (expectedTurn !== undefined && expectedTurn !== game.turn) {
      throw new ConflictError("This month has already been decided", {
        code: "TURN_ALREADY_DECIDED",
      });
    }

    const cards = await findAllCards(client);
    const flags = await findFlags(client, gameId);
    const appearances = await findAppearances(client, gameId);
    const scheduledEvents = await findScheduledEvents(client, gameId);
    // Locked with the game row, so two requests can never move the same chain in parallel.
    const procedure = await findActiveProcedure(client, gameId, { forUpdate: true });
    // Read under the same lock and rebuilt against the pack: the ministries and their names belong
    // to the country, who sits in them to the stored seats.
    const cabinet = restoreCabinet(
      findCountry(game.countryCode),
      await findCabinetSeats(client, gameId),
    );

    const turnResult = resolveTurn({
      state: { ...game, flags },
      cards,
      choice,
      appearances,
      scheduledEvents,
      // Institutional numbers and vocabulary come from the country pack, never from the engine.
      country: findCountry(game.countryCode),
      procedure,
      cabinet,
    });

    try {
      await insertDecision(client, gameId, turnResult.decision);
    } catch (error) {
      if (isUniqueViolation(error, "decisions_one_per_turn")) {
        throw new ConflictError("This month has already been decided", {
          code: "TURN_ALREADY_DECIDED",
          cause: error,
        });
      }
      throw error;
    }

    const { created, firedSequence, cancelledSequences } = turnResult.eventChanges;
    await replaceFlags(client, gameId, turnResult.state.flags);
    await insertScheduledEvents(client, gameId, created);
    if (firedSequence !== null) {
      await updateScheduledEventStatus(client, gameId, [firedSequence], EVENT_STATUS.FIRED);
    }
    await updateScheduledEventStatus(client, gameId, cancelledSequences, EVENT_STATUS.CANCELLED);
    if (turnResult.appearance) await insertAppearance(client, gameId, turnResult.appearance);
    await persistProcedure(client, gameId, procedure, turnResult.procedure);
    // Guarded: replacing the seats deletes them first, so a government that holds no cabinet at all
    // must not reach this — it would wipe the table row set instead of leaving it untouched.
    if (turnResult.cabinet) await replaceCabinetSeats(client, gameId, turnResult.cabinet);
    // A card that forced a minister out is recorded as well, as a change the Presidency did not
    // sign. `source` is what keeps it outside the one-action-a-month index: a constitutional
    // consequence is never refused because the month's own action had already been spent.
    for (const change of turnResult.cabinetChanges ?? []) {
      await insertCabinetAction(
        client,
        gameId,
        {
          turn: change.turn,
          action: "dismiss",
          ministryKey: change.portfolio,
          previousCharacterId: change.holder,
          nextCharacterId: null,
          effects: {},
        },
        "decision",
      );
    }
    await updateGame(client, gameId, turnResult.state);

    // The procedure as it stood before this month, so the response can say what changed.
    return {
      result: turnResult,
      snapshot: await loadSnapshot(client, gameId, cards),
      procedureBefore: procedure,
    };
  });

  logger.info("game.decision", {
    gameId,
    turn: result.decision.turn,
    cardSlug: result.decision.cardSlug,
    choice,
  });
  if (result.warnings.length > 0) {
    logger.warn("game.card_selection_fallback", {
      gameId,
      warnings: result.warnings.map((warning) => warning.code),
    });
  }
  if (!result.decision.consequence) {
    logger.warn("content.consequence_missing", { cardSlug: result.decision.cardSlug, choice });
  }
  if (result.gameOver) {
    logger.info("game.ended", {
      gameId,
      endingCode: result.ending.code,
      months: result.decision.turn,
    });
  }

  const response = {
    decision: toDecisionView(result.decision),
    effects: result.decision.deltas,
    resultText: result.decision.resultText,
    // { headline, reaction } authored for the chosen side, or null for legacy content. The same
    // snapshot was stored with the decision in the transaction above.
    consequence: result.decision.consequence,
    game: snapshot.game,
    // Where the constitutional chain stands after this month, or null for a government facing none.
    procedure: snapshot.procedure,
    // The cabinet as it stands after this month. It travels with every response that rebuilds the
    // client's snapshot: leaving it out here emptied the cabinet between decisions, and the room
    // disappeared from the header until the page was reloaded.
    cabinet: snapshot.cabinet,
    // What the chain did this month, so the interface reacts to an event instead of reading text.
    procedureEvent: toProcedureEvent(
      procedureBefore,
      result.procedure,
      result.procedureVotes ?? result.ending?.procedureVotes ?? null,
    ),
    // Who left the government because of this month's decision, in public words. Empty whenever the
    // card asked nothing of the cabinet, which is almost every month.
    cabinetChanges: toCabinetChangeViews(
      result.cabinetChanges,
      findCountry(snapshot.game.country?.code),
    ),
    // What the court decided this month, or null on the months it had nothing before it — which is
    // most of them. Always present, never omitted: a field that appears on only some responses is
    // how the interface loses something after a decision and finds it again on reload.
    courtRuling: toCourtRulingView(result.courtRuling, findCountry(snapshot.game.country?.code)),
    gameOver: result.gameOver,
  };

  return result.gameOver
    ? { ...response, ending: snapshot.ending, summary: snapshot.summary }
    : { ...response, nextCard: snapshot.currentCard };
}

export async function createSuccessor(previousGameId) {
  assertGameId(previousGameId);

  const snapshot = await withTransaction(async (client) => {
    const previous = await findGameById(client, previousGameId, { forUpdate: true });
    if (!previous) throw gameNotFound();
    if (previous.status === GAME_STATUS.ACTIVE) {
      throw new ConflictError("The previous government is still active", {
        code: "GAME_STILL_ACTIVE",
      });
    }

    const start = buildSuccessorStart(await findFlags(client, previousGameId));
    const cards = await findAllCards(client);
    // A successor inherits the country, never the candidate: it is a different president.
    const gameId = await insertStartedGame(client, {
      cards,
      startYear: previous.startYear + Math.ceil(previous.turn / MONTHS_PER_YEAR),
      meters: start.meters,
      flags: start.flags,
      previousGameId,
      countryCode: previous.countryCode,
      candidate: null,
      election: null,
    });

    return {
      ...(await loadSnapshot(client, gameId, cards)),
      inheritance: { inheritedFlags: start.inherited, modifiers: start.modifiers },
    };
  });

  logger.info("game.successor_created", {
    gameId: snapshot.game.id,
    previousGameId,
    inheritedFlags: snapshot.inheritance.inheritedFlags.map((flag) => flag.key),
  });
  return snapshot;
}

export async function getChronicle(gameId) {
  assertGameId(gameId);

  return withTransaction(async (client) => {
    const game = await findGameById(client, gameId);
    if (!game) throw gameNotFound();

    const decisions = await findDecisions(client, gameId);
    const flags = await findFlags(client, gameId);
    // Every procedure this government faced, resolved or running. They are a separate series: a
    // constitutional milestone is not a decision the president signed.
    const procedures = await findProcedures(client, gameId);
    const country = findCountry(game.countryCode);

    return {
      gameId,
      previousGameId: game.previousGameId,
      inheritedFlags: Object.entries(flags)
        .filter(([, flag]) => flag.inherited)
        .map(([key, flag]) => ({ key, label: flag.label })),
      entries: decisions.map(toDecisionView),
      procedureEntries: procedures.flatMap((procedure) =>
        toProcedureChronicleView(procedure, country),
      ),
      // A third series: who entered and who left the government, and whether the president signed it
      // or a card forced it.
      cabinetEntries: toCabinetChronicleView(await findCabinetActions(client, gameId), country),
    };
  });
}
