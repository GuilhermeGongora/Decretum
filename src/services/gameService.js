import { randomUUID } from "node:crypto";
import { epithetDefinitions } from "@/src/content/epithets";
import { withTransaction } from "@/src/database/transaction";
import { EVENT_STATUS, GAME_STATUS, MONTHS_PER_YEAR } from "@/src/domain/constants";
import { buildSuccessorStart } from "@/src/domain/successor";
import { buildGameSummary } from "@/src/domain/summary";
import { resolveTurn, startGame } from "@/src/domain/turn";
import { ConflictError, NotFoundError } from "@/src/errors";
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
import {
  toCardView,
  toDecisionView,
  toEndingView,
  toGameView,
  toSummaryView,
} from "@/src/services/gameViews";
import { logger } from "@/src/utils/logger";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

async function loadLockedGame(client, gameId) {
  const game = await findGameById(client, gameId, { forUpdate: true });
  if (!game) throw gameNotFound();
  return game;
}

async function loadSnapshot(client, gameId, cards) {
  const game = await findGameById(client, gameId);
  if (!game) throw gameNotFound();

  if (game.status === GAME_STATUS.ACTIVE) {
    const card = cards.find((candidate) => candidate.slug === game.currentCardSlug);
    return {
      game: toGameView(game),
      currentCard: toCardView(card, game.meters),
      ending: null,
      summary: null,
    };
  }

  const decisions = await findDecisions(client, gameId);
  const flags = await findFlags(client, gameId);
  const endings = await findAllEndings(client);
  const summary = buildGameSummary({ state: { ...game, flags }, decisions });

  return {
    game: toGameView(game),
    currentCard: null,
    ending: toEndingView(game.endingCode, endings),
    summary: toSummaryView(summary, { endings, epithets: epithetDefinitions }),
  };
}

async function insertStartedGame(client, { cards, startYear, meters, flags, previousGameId }) {
  const { state, appearance } = startGame({
    cards,
    rngSeed: randomUUID(),
    meters,
    flags,
    previousGameId,
  });

  let gameId;
  try {
    gameId = await insertGame(client, { state, startYear });
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
  await insertAppearance(client, gameId, appearance);
  return gameId;
}

export async function createGame() {
  const snapshot = await withTransaction(async (client) => {
    const cards = await findAllCards(client);
    const gameId = await insertStartedGame(client, {
      cards,
      startYear: 1,
      meters: undefined,
      flags: {},
    });
    return loadSnapshot(client, gameId, cards);
  });

  logger.info("game.created", { gameId: snapshot.game.id, cardSlug: snapshot.currentCard.slug });
  return snapshot;
}

export async function getGame(gameId) {
  assertGameId(gameId);
  return withTransaction(async (client) =>
    loadSnapshot(client, gameId, await findAllCards(client)),
  );
}

// GDD §12.2: the whole month is resolved inside one transaction holding the game row lock.
export async function decide(gameId, { choice, expectedTurn }) {
  assertGameId(gameId);

  const { result, snapshot } = await withTransaction(async (client) => {
    const game = await loadLockedGame(client, gameId);

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

    const turnResult = resolveTurn({
      state: { ...game, flags },
      cards,
      choice,
      appearances,
      scheduledEvents,
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
    await updateGame(client, gameId, turnResult.state);

    return { result: turnResult, snapshot: await loadSnapshot(client, gameId, cards) };
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
    gameOver: result.gameOver,
  };

  return result.gameOver
    ? { ...response, ending: snapshot.ending, summary: snapshot.summary }
    : { ...response, nextCard: snapshot.currentCard };
}

export async function createSuccessor(previousGameId) {
  assertGameId(previousGameId);

  const snapshot = await withTransaction(async (client) => {
    const previous = await loadLockedGame(client, previousGameId);
    if (previous.status === GAME_STATUS.ACTIVE) {
      throw new ConflictError("The previous government is still active", {
        code: "GAME_STILL_ACTIVE",
      });
    }

    const start = buildSuccessorStart(await findFlags(client, previousGameId));
    const cards = await findAllCards(client);
    const gameId = await insertStartedGame(client, {
      cards,
      startYear: previous.startYear + Math.ceil(previous.turn / MONTHS_PER_YEAR),
      meters: start.meters,
      flags: start.flags,
      previousGameId,
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

    return {
      gameId,
      previousGameId: game.previousGameId,
      inheritedFlags: Object.entries(flags)
        .filter(([, flag]) => flag.inherited)
        .map(([key, flag]) => ({ key, label: flag.label })),
      entries: decisions.map(toDecisionView),
    };
  });
}
